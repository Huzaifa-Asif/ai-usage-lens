import { spawn } from "node:child_process";
import { normalizeCodexRateLimits,normalizeCodexAccountActivity } from "./codex-adapter.js";

export const CAPTURE_SCHEMA="token-lens/codex-readonly-capture-v1";
export const ALLOWED_METHODS=Object.freeze(["initialize","initialized","account/rateLimits/read","account/usage/read"]);
const DEFAULT_MAX_BYTES=1_048_576;
const DEFAULT_TIMEOUT_MS=8_000;

export class CollectorError extends Error { constructor(code){super(code);this.name="CollectorError";this.code=code;} }

const assertSafeOptions=o=>{
  if(typeof o.executable!=="string"||!o.executable||o.executable.includes("\0"))throw new CollectorError("invalid_executable");
  if(!Array.isArray(o.appServerArgs)||o.appServerArgs.some(x=>typeof x!=="string"||x.includes("\0")))throw new CollectorError("invalid_arguments");
  if(o.threadId!==undefined&&(typeof o.threadId!=="string"||!o.threadId||o.threadId.length>500))throw new CollectorError("invalid_thread_id");
};

/** Read-only JSONL client. It never invokes thread, turn, login, hook, model, or mutation methods. */
export function collectCodexReadOnly(options){
  const o={appServerArgs:["app-server"],timeoutMs:DEFAULT_TIMEOUT_MS,maxBytes:DEFAULT_MAX_BYTES,expectedProtocolVersion:null,spawnImpl:spawn,...options};assertSafeOptions(o);
  if(!Number.isSafeInteger(o.timeoutMs)||o.timeoutMs<100||o.timeoutMs>60_000)throw new CollectorError("invalid_timeout");
  if(!Number.isSafeInteger(o.maxBytes)||o.maxBytes<1024||o.maxBytes>10_485_760)throw new CollectorError("invalid_max_bytes");
  if(o.signal?.aborted)return Promise.reject(new CollectorError("cancelled"));
  return new Promise((resolve,reject)=>{
    let child,done=false,initialized=false,bytes=0,buffer="",stderrBytes=0;const results=new Map();
    const finish=(err,value)=>{if(done)return;done=true;clearTimeout(timer);o.signal?.removeEventListener("abort",onAbort);if(child){child.stdin.end();if(!child.killed)child.kill("SIGTERM");const hardStop=setTimeout(()=>{if(child.exitCode===null)child.kill("SIGKILL")},250);hardStop.unref();}err?reject(err):resolve(value);};
    const fail=code=>finish(new CollectorError(code));
    const send=message=>{if(!ALLOWED_METHODS.includes(message.method))return fail("method_not_allowed");child.stdin.write(`${JSON.stringify(message)}\n`);};
    const requestReads=()=>{send({method:"initialized",params:{}});send({method:"account/rateLimits/read",id:2});send({method:"account/usage/read",id:3,...(o.threadId?{params:{threadId:o.threadId}}:{})});};
    const accept=msg=>{
      if(!msg||typeof msg!=="object"||Array.isArray(msg))return fail("malformed_response");
      if(msg.id===1){
        if(initialized)return fail("duplicate_initialize_response");
        if(msg.error)return fail("initialize_failed");
        const got=msg.result?.protocolVersion;if(o.expectedProtocolVersion&&got!==o.expectedProtocolVersion)return fail("protocol_version_mismatch");
        initialized=true;requestReads();return;
      }
      if(msg.id===2||msg.id===3){
        if(!initialized)return fail("response_before_initialize");
        if(msg.error)return fail(msg.id===2?"rate_limits_read_failed":"usage_read_failed");
        if(!Object.hasOwn(msg,"result")||results.has(msg.id))return fail("malformed_response");
        results.set(msg.id,msg.result);
        if(results.size===2){const capturedAt=new Date().toISOString();let quotaSnapshot,accountActivity;try{quotaSnapshot=normalizeCodexRateLimits(results.get(2),{capturedAt});accountActivity=normalizeCodexAccountActivity(results.get(3));}catch{return fail("malformed_response")}finish(null,{schemaVersion:CAPTURE_SCHEMA,capturedAt,provenance:{collectorVersion:"0.3.0",transport:"stdio",readOnly:true,methods:["account/rateLimits/read","account/usage/read"],threadScopedUsage:o.threadId??null},quotaSnapshot,accountActivity,raw:{rateLimits:results.get(2),usage:results.get(3)}});}
      }
    };
    const onAbort=()=>fail("cancelled");
    const timer=setTimeout(()=>fail("timeout"),o.timeoutMs);
    try{child=o.spawnImpl(o.executable,o.appServerArgs,{stdio:["pipe","pipe","pipe"],shell:false,env:o.env||process.env});}catch{return fail("spawn_failed");}
    o.signal?.addEventListener("abort",onAbort,{once:true});
    child.on("error",()=>fail("spawn_failed"));child.on("exit",()=>{if(!done)fail("process_exited")});
    child.stdin.on("error",()=>fail("stdin_closed"));
    child.stderr.on("data",chunk=>{stderrBytes+=chunk.length;if(stderrBytes>o.maxBytes)fail("output_limit_exceeded")});
    child.stdout.on("data",chunk=>{bytes+=chunk.length;if(bytes>o.maxBytes)return fail("output_limit_exceeded");buffer+=chunk.toString("utf8");let i;while((i=buffer.indexOf("\n"))>=0&&!done){const line=buffer.slice(0,i);buffer=buffer.slice(i+1);if(!line.trim())continue;let msg;try{msg=JSON.parse(line)}catch{return fail("malformed_response")}accept(msg);}});
    send({method:"initialize",id:1,params:{clientInfo:{name:"token_lens_local",title:"AI Usage Lens local read-only collector",version:"0.3.0"}}});
  });
}
