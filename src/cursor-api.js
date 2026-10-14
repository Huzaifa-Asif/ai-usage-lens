const ORIGIN="https://api.cursor.com";
const PATHS=Object.freeze({daily:"/teams/daily-usage-data",spend:"/teams/spend"});
export class CursorApiError extends Error{constructor(code){super(code);this.name="CursorApiError";this.code=code}}
const object=value=>value&&typeof value==="object"&&!Array.isArray(value);
const safeCount=value=>Number.isSafeInteger(value)&&value>=0?value:0;
const optionalNumber=value=>typeof value==="number"&&Number.isFinite(value)&&value>=0?value:null;
function minimizeDaily(rows){
  const byDay=new Map();
  for(const row of rows){
    if(!object(row))continue;
    const day=typeof row.day==="string"?row.day:(typeof row.date==="string"?row.date:null);
    if(!day||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}/.test(day))continue;
    const key=day.slice(0,10),current=byDay.get(key)||{day:key,agentRequests:0,chatRequests:0,composerRequests:0,subscriptionIncludedRequests:0,apiKeyRequests:0,usageBasedRequests:0,models:{}};
    current.agentRequests+=safeCount(row.agentRequests);
    current.chatRequests+=safeCount(row.chatRequests);
    current.composerRequests+=safeCount(row.composerRequests);
    current.subscriptionIncludedRequests+=safeCount(row.subscriptionIncludedReqs??row.subscriptionIncludedRequests);
    current.apiKeyRequests+=safeCount(row.apiKeyReqs??row.apiKeyRequests);
    current.usageBasedRequests+=safeCount(row.usageBasedReqs??row.usageBasedRequests);
    if(typeof row.mostUsedModel==="string"&&row.mostUsedModel.length<=200)current.models[row.mostUsedModel]=(current.models[row.mostUsedModel]||0)+1;
    byDay.set(key,current);
  }
  return [...byDay.values()].sort((a,b)=>a.day.localeCompare(b.day)).map(({models,...row})=>({...row,mostUsedModel:Object.entries(models).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0]?.[0]||null}));
}
function minimizeSpend(rows,totalMembers){
  const onDemand=rows.map(row=>optionalNumber(row?.spendCents)).filter(amount=>amount!==null),overall=rows.map(row=>optionalNumber(row?.overallSpendCents)).filter(amount=>amount!==null);
  return {memberRows:rows.length,totalMembers,onDemandSpendCents:onDemand.length?onDemand.reduce((sum,amount)=>sum+amount,0):null,overallSpendCents:overall.length?overall.reduce((sum,amount)=>sum+amount,0):null,memberRowsWithOnDemandSpend:onDemand.length,memberRowsWithOverallSpend:overall.length,complete:true};
}
async function boundedJson(response){
  const declared=Number(response.headers?.get?.("content-length"));
  if(Number.isFinite(declared)&&declared>2_000_000)throw new CursorApiError("response_too_large");
  if(response.body?.getReader){const reader=response.body.getReader(),decoder=new TextDecoder();let total=0,text="";try{for(;;){const{done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>2_000_000){await reader.cancel("response_too_large");throw new CursorApiError("response_too_large")}text+=decoder.decode(value,{stream:true})}text+=decoder.decode();return JSON.parse(text)}catch(error){if(error instanceof CursorApiError)throw error;throw new CursorApiError("malformed_response")}finally{try{reader.releaseLock()}catch{}}}
  let value;try{value=await response.json()}catch{throw new CursorApiError("malformed_response")}
  if(Buffer.byteLength(JSON.stringify(value))>2_000_000)throw new CursorApiError("response_too_large");
  return value;
}
async function request(path,{apiKey,fetchImpl,signal,body}){
  let response;try{response=await fetchImpl(new URL(path,ORIGIN),{method:"POST",headers:{Authorization:`Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,Accept:"application/json","Content-Type":"application/json"},body:JSON.stringify(body),redirect:"error",signal})}catch(error){if(signal.aborted)throw new CursorApiError(signal.reason==="timeout"?"timeout":"cancelled");throw new CursorApiError("network_unavailable")}
  if(response.status===401)throw new CursorApiError("authentication_failed");
  if(response.status===403)throw new CursorApiError("permission_denied");
  if(response.status===429)throw new CursorApiError("rate_limited");
  if(!response.ok)throw new CursorApiError("provider_error");
  return boundedJson(response);
}
export async function collectCursorTeamUsage(options={}){
  const {apiKey,fetchImpl=globalThis.fetch,signal,startDate,endDate,timeoutMs=8000}=options;
  if(typeof apiKey!=="string"||apiKey.length<8)throw new CursorApiError("cursor_key_missing");
  if(!Number.isSafeInteger(startDate)||!Number.isSafeInteger(endDate)||startDate<0||endDate<=startDate||endDate-startDate>31*86400000)throw new CursorApiError("invalid_date_range");
  if(!Number.isSafeInteger(timeoutMs)||timeoutMs<100||timeoutMs>60000)throw new CursorApiError("invalid_timeout");
  if(signal?.aborted)throw new CursorApiError("cancelled");
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort("timeout"),timeoutMs),abort=()=>controller.abort("cancelled");signal?.addEventListener("abort",abort,{once:true});
  try{
    const readSpend=async()=>{const rows=[];let totalPages=1,totalMembers=null;for(let page=1;page<=totalPages;page++){
      if(page>100)throw new CursorApiError("pagination_limit_exceeded");
      const body=await request(PATHS.spend,{apiKey,fetchImpl,signal:controller.signal,body:{page,pageSize:500}});
      if(!object(body)||!Array.isArray(body.teamMemberSpend)||!Number.isSafeInteger(body.totalPages)||body.totalPages<1||body.totalPages>100)throw new CursorApiError("malformed_response");
      if(page===1){totalPages=body.totalPages;totalMembers=Number.isSafeInteger(body.totalMembers)&&body.totalMembers>=0?body.totalMembers:null}else if(body.totalPages!==totalPages)throw new CursorApiError("malformed_response");
      if(rows.length+body.teamMemberSpend.length>10_000)throw new CursorApiError("result_limit_exceeded");rows.push(...body.teamMemberSpend);
    }return minimizeSpend(rows,totalMembers)};
    const [daily,spending]=await Promise.all([
      request(PATHS.daily,{apiKey,fetchImpl,signal:controller.signal,body:{startDate,endDate}}),
      readSpend()
    ]);
    if(!object(daily)||!Array.isArray(daily.data))throw new CursorApiError("malformed_response");
    if(daily.data.length>10_000)throw new CursorApiError("result_limit_exceeded");
    return {schemaVersion:"token-lens/cursor-team-usage-v1",capturedAt:new Date().toISOString(),provenance:{origin:ORIGIN,paths:[PATHS.daily,PATHS.spend],readOnly:true,startDate,endDate,scope:"cursor_team_admin",minimized:true},dailyUsage:minimizeDaily(daily.data),spending,limitations:["Rows are aggregated by day before leaving the local companion; member identity fields are discarded.","All documented spend pages are aggregated locally before identity-free totals are returned.","Cursor team aggregates are not local conversation transcripts.","Subscription-included requests are utilization, not billable API dollars.","Message text and per-message token counts are unavailable from these endpoints."]};
  }finally{clearTimeout(timer);controller.abort("cleanup");signal?.removeEventListener("abort",abort)}
}
export const CURSOR_API_ORIGIN=ORIGIN;export const CURSOR_API_PATHS=PATHS;
