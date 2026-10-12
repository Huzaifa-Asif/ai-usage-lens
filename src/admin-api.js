const ORIGIN="https://api.openai.com";
const PATHS=Object.freeze({usage:"/v1/organization/usage/completions",costs:"/v1/organization/costs"});
export class AdminApiError extends Error{constructor(code){super(code);this.name="AdminApiError";this.code=code}}
const integer=(v,name)=>{if(!Number.isSafeInteger(v)||v<0)throw new AdminApiError(`invalid_${name}`);return v};
const object=v=>v&&typeof v==="object"&&!Array.isArray(v);
async function boundedJson(response){const declared=Number(response.headers?.get?.("content-length"));if(Number.isFinite(declared)&&declared>2_000_000)throw new AdminApiError("response_too_large");if(response.body?.getReader){const reader=response.body.getReader(),decoder=new TextDecoder();let total=0,text="";try{for(;;){const{done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>2_000_000){await reader.cancel("response_too_large");throw new AdminApiError("response_too_large")}text+=decoder.decode(value,{stream:true})}text+=decoder.decode();return JSON.parse(text)}catch(e){if(e instanceof AdminApiError)throw e;throw new AdminApiError("malformed_response")}finally{try{reader.releaseLock()}catch{}}}try{return await response.json()}catch{throw new AdminApiError("malformed_response")}}
export async function collectAdminAggregates(options={}){
 const {apiKey,fetchImpl=globalThis.fetch,signal,startTime,endTime,timeoutMs=8000,maxPages=20}=options;
 if(typeof apiKey!=="string"||apiKey.length<8)throw new AdminApiError("admin_key_missing");
 integer(startTime,"start_time");if(endTime!==undefined)integer(endTime,"end_time");
 if(!Number.isSafeInteger(timeoutMs)||timeoutMs<100||timeoutMs>60000)throw new AdminApiError("invalid_timeout");
 if(!Number.isSafeInteger(maxPages)||maxPages<1||maxPages>100)throw new AdminApiError("invalid_max_pages");
 if(signal?.aborted)throw new AdminApiError("cancelled");
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort("timeout"),timeoutMs),abort=()=>controller.abort("cancelled");signal?.addEventListener("abort",abort,{once:true});
 const read=async(kind)=>{const rows=[];let page=null;for(let n=0;n<maxPages;n++){
   const u=new URL(PATHS[kind],ORIGIN);u.searchParams.set("start_time",String(startTime));if(endTime!==undefined)u.searchParams.set("end_time",String(endTime));if(kind==="usage")u.searchParams.set("bucket_width","1d");if(page)u.searchParams.set("page",page);
   let response;try{response=await fetchImpl(u,{method:"GET",headers:{Authorization:`Bearer ${apiKey}`,Accept:"application/json"},redirect:"error",signal:controller.signal})}catch{if(controller.signal.aborted)throw new AdminApiError(controller.signal.reason==="timeout"?"timeout":"cancelled");throw new AdminApiError("network_unavailable")}
   if(response.status===401)throw new AdminApiError("authentication_failed");if(response.status===403)throw new AdminApiError("permission_denied");if(response.status===429)throw new AdminApiError("rate_limited");if(!response.ok)throw new AdminApiError("provider_error");
   const body=await boundedJson(response);if(!object(body)||!Array.isArray(body.data))throw new AdminApiError("malformed_response");if(rows.length+body.data.length>10000)throw new AdminApiError("result_limit_exceeded");rows.push(...body.data);page=body.next_page??null;if(page!==null&&(typeof page!=="string"||!page||page.length>1000))throw new AdminApiError("malformed_response");if(!page)return rows;
 }throw new AdminApiError("pagination_limit_exceeded")};
 try{const [usage,costs]=await Promise.all([read("usage"),read("costs")]);return{schemaVersion:"token-lens/openai-admin-aggregates-v1",capturedAt:new Date().toISOString(),provenance:{origin:ORIGIN,paths:[PATHS.usage,PATHS.costs],readOnly:true,startTime,endTime:endTime??null,bucketWidth:"1d",attribution:"organization_aggregate_not_thread_or_message"},usageBuckets:usage,costBuckets:costs,limitations:["Organization aggregates are not per-request, per-thread, or per-message usage.","Cost buckets are provider aggregates and remain separate from local rate-card estimates."]}}finally{clearTimeout(timer);controller.abort("cleanup");signal?.removeEventListener("abort",abort)}
}
export const ADMIN_API_ORIGIN=ORIGIN;export const ADMIN_API_PATHS=PATHS;
export const adminConfigState=env=>typeof env?.OPENAI_ADMIN_KEY==="string"&&env.OPENAI_ADMIN_KEY.length>=8?"configured_unverified":"unavailable";
