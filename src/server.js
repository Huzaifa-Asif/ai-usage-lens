import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { collectCodexReadOnly } from "./codex-collector.js";
import { collectAdminAggregates } from "./admin-api.js";
import { collectCursorTeamUsage } from "./cursor-api.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const publicRoot=join(root,"public");
const port = Number(process.env.PORT || 4173);
const types = { ".html":"text/html; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".css":"text/css; charset=utf-8", ".json":"application/json; charset=utf-8", ".svg":"image/svg+xml" };
export const STATIC_HEADERS={ "cache-control":"no-store", "content-security-policy":"default-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'", "x-content-type-options":"nosniff" };
export const serveStatic = async (req, res) => {
  try {
    const raw=decodeURIComponent(new URL(req.url,"http://localhost").pathname);
    let target;
    if(raw==="/")target=join(publicRoot,"index.html");
    else if(["/src/core.js","/src/connection-state.js","/src/presentation.js","/src/collection-client.js","/src/skill-generator.js"].includes(raw))target=join(root,raw.slice(1));
    else { target=resolve(publicRoot,`.${raw}`); if(!target.startsWith(publicRoot+sep)||raw.split("/").some(x=>x.startsWith(".")))throw new Error("not allowed"); }
    const body = await readFile(target);
    res.writeHead(200, { "content-type": types[extname(target)] || "application/octet-stream", ...STATIC_HEADERS });
    res.end(body);
  } catch { res.writeHead(404, {"content-type":"text/plain"}); res.end("Not found"); }
};
const json=(res,status,value)=>{res.writeHead(status,{"content-type":"application/json; charset=utf-8",...STATIC_HEADERS});res.end(JSON.stringify(value))};
const SAFE_ERRORS=new Set(["admin_key_missing","cursor_key_missing","authentication_failed","permission_denied","rate_limited","provider_error","network_unavailable","timeout","cancelled","malformed_response","response_too_large","result_limit_exceeded","pagination_limit_exceeded","spawn_failed","process_exited","output_limit_exceeded","rate_limits_read_failed","usage_read_failed"]);
const apiResult=(res,value)=>{const body=JSON.stringify(value);if(Buffer.byteLength(body)>5_000_000)return json(res,502,{error:"result_limit_exceeded"});res.writeHead(200,{"content-type":"application/json; charset=utf-8",...STATIC_HEADERS});res.end(body)};
export function createHandler({adminCollector=collectAdminAggregates,codexCollector=collectCodexReadOnly,cursorCollector=collectCursorTeamUsage,env=process.env,now=()=>Date.now()}={}){
 let collecting=false;
 return async(req,res)=>{
  if(!req.url?.startsWith('/api/'))return serveStatic(req,res);
  const host=req.headers?.host||'',origin=req.headers?.origin||'';
  if(req.method!=='POST'||!/^(127\.0\.0\.1|localhost):\d+$/.test(host)||origin!==`http://${host}`)return json(res,403,{error:'request_rejected'});
  if(!['/api/collect/codex','/api/collect/admin','/api/collect/cursor'].includes(req.url))return json(res,404,{error:'not_found'});
  if(collecting)return json(res,409,{error:'collection_in_progress'});
  collecting=true;
  const controller=new AbortController();
  const abort=()=>controller.abort();
  const onClose=()=>{if(!res.writableEnded)abort();};
  req.once?.('aborted',abort);res.once?.('close',onClose);
  if(req.aborted||res.destroyed)abort();
  try{
   let value;
   if(req.url==='/api/collect/codex')value=await codexCollector({executable:env.CODEX_PATH||'codex',signal:controller.signal});
   else if(req.url==='/api/collect/cursor'){const end=now(),start=end-30*86400000;value=await cursorCollector({apiKey:env.CURSOR_API_KEY,startDate:start,endDate:end,signal:controller.signal});}
   else{const end=Math.floor(now()/1000);value=await adminCollector({apiKey:env.OPENAI_ADMIN_KEY,startTime:end-30*86400,endTime:end,signal:controller.signal});}
   if(!controller.signal.aborted)return apiResult(res,value);
  }catch(error){if(!controller.signal.aborted)return json(res,502,{error:SAFE_ERRORS.has(error?.code)?error.code:'collector_error'});}
  finally{collecting=false;req.removeListener?.('aborted',abort);res.removeListener?.('close',onClose);}
 };
}
export function createServer(options){return http.createServer(createHandler(options));}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)createServer().listen(port,"127.0.0.1",()=>console.log(`AI Usage Lens: http://127.0.0.1:${port}`));
