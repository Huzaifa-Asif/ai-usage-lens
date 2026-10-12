import readline from "node:readline";
import {writeFileSync} from "node:fs";
const mode=process.env.STUB_MODE||"ok";const rl=readline.createInterface({input:process.stdin});
if(mode==="flood")process.stdout.write("x".repeat(20_000));
if(mode==="before-init")process.stdout.write(JSON.stringify({id:2,result:{rateLimits:null}})+"\n");
rl.on("line",line=>{const m=JSON.parse(line);if(mode==="hang")return;if(mode==="early-exit")return process.exit(0);if(m.method==="initialize"){if(mode==="malformed")return process.stdout.write("{secret:SECRET_SENTINEL}\n");if(mode==="version")return process.stdout.write(JSON.stringify({id:1,result:{protocolVersion:"wrong"}})+"\n");process.stdout.write(JSON.stringify({id:1,result:{protocolVersion:"v1"}})+"\n");if(mode==="duplicate-init")process.stdout.write(JSON.stringify({id:1,result:{protocolVersion:"v1"}})+"\n");}if(m.method==="account/rateLimits/read")process.stdout.write(JSON.stringify({id:m.id,result:mode==="nulls"?{rateLimits:null}:{rateLimits:{primary:{usedPercent:5}}}})+"\n");if(m.method==="account/usage/read")process.stdout.write(JSON.stringify({id:m.id,result:mode==="primitive-usage"?42:mode==="nulls"?{summary:null,dailyUsageBuckets:null}:{summary:{lifetimeTokens:10}}})+"\n");});
process.on("SIGTERM",()=>{if(process.env.STUB_EXIT_MARKER)writeFileSync(process.env.STUB_EXIT_MARKER,"terminated");process.exit(0)});
