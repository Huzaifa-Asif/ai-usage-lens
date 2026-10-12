import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { collectCodexReadOnly } from "./codex-collector.js";
import { collectAdminAggregates,AdminApiError } from "./admin-api.js";

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
    else if(raw==="/src/core.js"||raw==="/src/connection-state.js")target=join(root,raw.slice(1));
    else { target=resolve(publicRoot,`.${raw}`); if(!target.startsWith(publicRoot+sep)||raw.split("/").some(x=>x.startsWith(".")))throw new Error("not allowed"); }
    const body = await readFile(target);
    res.writeHead(200, { "content-type": types[extname(target)] || "application/octet-stream", ...STATIC_HEADERS });
    res.end(body);
  } catch { res.writeHead(404, {"content-type":"text/plain"}); res.end("Not found"); }
};
const json=(res,status,value)=>{res.writeHead(status,{"content-type":"application/json; charset=utf-8",...STATIC_HEADERS});res.end(JSON.stringify(value))};
const SAFE_ERRORS=new Set(["admin_key_missing","authentication_failed","permission_denied","rate_limited","provider_error","network_unavailable","timeout","cancelled","malformed_response","response_too_large","result_limit_exceeded","pagination_limit_exceeded","spawn_failed","process_exited","output_limit_exceeded","rate_limits_read_failed","usage_read_failed"]);
const apiResult=(res,value)=>{const body=JSON.stringify(value);if(Buffer.byteLength(body)>5_000_000)return json(res,502,{error:"result_limit_exceeded"});res.writeHead(200,{"content-type":"application/json; charset=utf-8",...STATIC_HEADERS});res.end(body)};
export function createHandler({adminCollector=collectAdminAggregates,codexCollector=collectCodexReadOnly,env=process.env,now=()=>Date.now()}={}){return async(req,res)=>{const host=req.headers?.host||"";const origin=req.headers?.origin||"";if(req.url?.startsWith("/api/")){if(req.method!=="POST"||!/^(127\.0\.0\.1|localhost):\d+$/.test(host)||origin!==`http://${host}`)return json(res,403,{error:"request_rejected"});try{if(req.url==="/api/collect/codex")return apiResult(res,await codexCollector({executable:env.CODEX_PATH||"codex"}));if(req.url==="/api/collect/admin"){const end=Math.floor(now()/1000),start=end-30*86400;return apiResult(res,await adminCollector({apiKey:env.OPENAI_ADMIN_KEY,startTime:start,endTime:end}))}return json(res,404,{error:"not_found"})}catch(e){return json(res,502,{error:SAFE_ERRORS.has(e?.code)?e.code:"collector_error"})}}return serveStatic(req,res)}}
export function createServer(options){return http.createServer(createHandler(options));}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)createServer().listen(port,"127.0.0.1",()=>console.log(`Token Lens: http://127.0.0.1:${port}`));
