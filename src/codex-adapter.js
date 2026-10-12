/**
 * Preserve captured, user-authorized Codex App Server token notifications as
 * cumulative thread snapshots. They are not a per-message billing ledger: `last`
 * is only the latest appended usage and `total` is cumulative.
 */
export function normalizeCodexTokenSnapshots(events, { capturedAt = "1970-01-01T00:00:00.000Z", accountNamespace="default", source="codex-app-server" } = {}) {
  if (!Array.isArray(events)) throw new TypeError("events must be an array");
  const latest = new Map();
  const counts=(value,path)=>{if(!value||typeof value!=="object")throw new TypeError(`${path} must be an object`);const out={};for(const [k,v] of Object.entries(value)){if(!Number.isSafeInteger(v)||v<0)throw new TypeError(`${path}.${k} must be a non-negative safe integer`);out[k]=v;}if((out.cachedInputTokens!==undefined||out.cacheWriteInputTokens!==undefined)&&out.inputTokens===undefined)throw new TypeError(`${path} input subsets require inputTokens`);if(out.reasoningOutputTokens!==undefined&&out.outputTokens===undefined)throw new TypeError(`${path} reasoning requires outputTokens`);if(out.cachedInputTokens>out.inputTokens||out.cacheWriteInputTokens>out.inputTokens||(out.cachedInputTokens||0)+(out.cacheWriteInputTokens||0)>(out.inputTokens??Infinity))throw new TypeError(`${path} has impossible input subsets`);if(out.reasoningOutputTokens>out.outputTokens)throw new TypeError(`${path} has impossible reasoning subset`);return out;};
  for (let captureOrder=0; captureOrder<events.length; captureOrder++) {
    const envelope=events[captureOrder];
    if (envelope?.method !== "thread/tokenUsage/updated") continue;
    const p = envelope.params || envelope;
    if (typeof p.threadId!=="string"||!p.threadId||typeof p.turnId!=="string"||!p.turnId||!p.tokenUsage?.total) throw new TypeError(`event[${captureOrder}] has invalid thread/turn usage identity`);
    const observed=envelope.capturedAt||capturedAt;if(!Number.isFinite(Date.parse(observed)))throw new TypeError(`event[${captureOrder}].capturedAt must be ISO-8601`);
    const modelContextWindow=p.tokenUsage.modelContextWindow??null;if(modelContextWindow!==null&&(!Number.isSafeInteger(modelContextWindow)||modelContextWindow<0))throw new TypeError(`event[${captureOrder}].modelContextWindow is invalid`);
    const key=JSON.stringify([source,accountNamespace,p.threadId]);
    latest.set(key, {threadId:p.threadId,turnId:p.turnId,accountNamespace,observedAt:observed,captureOrder,total:counts(p.tokenUsage.total,`event[${captureOrder}].total`),last:p.tokenUsage.last?counts(p.tokenUsage.last,`event[${captureOrder}].last`):null,modelContextWindow,source,attribution:"cumulative_thread_snapshot"});
  }
  return {schemaVersion:"token-lens/codex-snapshots-v1",snapshots:[...latest.values()],limitations:["Do not sum snapshots.","The last breakdown is not whole-turn usage.","The first mid-thread total includes unattributed history."]};
}

/** Keep account summaries separate: these are activity, not request billing. */
export function normalizeCodexAccountActivity(result) {
  if (!result || typeof result !== "object" || Array.isArray(result)) throw new TypeError("account-usage result must be an object");
  const s = result?.summary || {};
  if (result.summary !== null && result.summary !== undefined && (typeof result.summary !== "object" || Array.isArray(result.summary))) throw new TypeError("summary must be an object or null");
  const nullable = (v,path="value") => {if(v===null||v===undefined)return null;if(!Number.isSafeInteger(v)||v<0)throw new TypeError(`${path} must be a non-negative safe integer or null`);return v;};
  const tu=result?.threadUsage;
  const threadUsage=tu&&typeof tu==="object"?{
    threadId:typeof tu.threadId==="string"?tu.threadId:null,
    estimatedUsageCreditsMicros:nullable(tu.estimatedUsageCreditsMicros,"threadUsage.estimatedUsageCreditsMicros"),
    estimatedUsageUsdMicros:nullable(tu.estimatedUsageUsdMicros,"threadUsage.estimatedUsageUsdMicros"),
    groups:Array.isArray(tu.groups)?tu.groups.map((g,i)=>({model:g.model??null,reasoningEffort:g.reasoningEffort??null,speed:g.speed??null,tokens:nullable(g.tokens,`threadUsage.groups[${i}].tokens`)})):null,
    classification:"provider_estimate_not_invoice"
  }:null;
  return {
    source: "codex-app-server-account-usage",
    lifetimeTokens: nullable(s.lifetimeTokens,"summary.lifetimeTokens"),
    peakDailyTokens: nullable(s.peakDailyTokens,"summary.peakDailyTokens"),
    dailyUsageBuckets: Array.isArray(result?.dailyUsageBuckets) ? result.dailyUsageBuckets.map((x,i) => ({ startDate: String(x.startDate), tokens: nullable(x.tokens,`dailyUsageBuckets[${i}].tokens`) })) : null,
    threadUsage,
    limitations: ["Account activity is not per-message usage.", "Token activity is not an invoice or API charge."]
  };
}

/** Normalize a full account/rateLimits/read response without inventing units. */
export function normalizeCodexRateLimits(result, { capturedAt = new Date().toISOString() } = {}) {
  if (!result || typeof result !== "object") throw new TypeError("rate-limit result must be an object");
  if(!Number.isFinite(Date.parse(capturedAt)))throw new TypeError("capturedAt must be ISO-8601");
  const buckets = result.rateLimitsByLimitId && typeof result.rateLimitsByLimitId === "object"
    ? Object.entries(result.rateLimitsByLimitId)
    : result.rateLimits ? [[result.rateLimits.limitId || "legacy", result.rateLimits]] : [];
  const windows=[];
  for (const [limitId,b] of buckets) {
    for (const [kind,w] of [["primary",b?.primary],["secondary",b?.secondary]]) {
      if (!w) continue;
      if(!Number.isInteger(w.usedPercent)||w.usedPercent<0||w.usedPercent>100) throw new TypeError(`invalid ${limitId}.${kind}.usedPercent`);
      if(w.windowDurationMins!==null&&w.windowDurationMins!==undefined&&(!Number.isSafeInteger(w.windowDurationMins)||w.windowDurationMins<0))throw new TypeError(`invalid ${limitId}.${kind}.windowDurationMins`);
      if(w.resetsAt!==null&&w.resetsAt!==undefined&&(!Number.isFinite(w.resetsAt)||w.resetsAt<0))throw new TypeError(`invalid ${limitId}.${kind}.resetsAt`);
      windows.push({
        id:`${limitId}:${kind}`,
        label:`${b.limitName || b.name || limitId} · ${kind}`,
        usedPercent:Number.isFinite(w.usedPercent)?w.usedPercent:null,
        remainingPercent:Number.isFinite(w.usedPercent)?100-w.usedPercent:null,
        windowDurationMinutes:Number.isSafeInteger(w.windowDurationMins)&&w.windowDurationMins>=0?w.windowDurationMins:null,
        resetsAt:Number.isFinite(w.resetsAt)&&w.resetsAt>=0?new Date(w.resetsAt*1000).toISOString():null,
        spendControlReached:typeof b.spendControlReached==="boolean"?b.spendControlReached:null,
        rateLimitReachedType:typeof b.rateLimitReachedType==="string"?b.rateLimitReachedType:null,
        note:`Reported for ${b.normalModelSlug || "unspecified model"}; ${b.planType || "unspecified plan"}`
      });
    }
  }
  return {
    schemaVersion:"token-lens/quotas-v1",capturedAt,
    source:'Codex App Server account/rateLimits/read',
    ordinaryUsageAllowed:typeof result.ordinaryUsageAllowed==="boolean"?result.ordinaryUsageAllowed:null,
    windows,
    unvaluedBalances: result.credits ? {hasCredits:result.credits.hasCredits??null,unlimited:result.credits.unlimited??null,balance:result.credits.balance??null,unit:"unspecified"} : null,
    limitations:["Percentages are rounded and cannot attribute exact prompt usage.","Expired snapshots require refresh; they do not prove quota restoration.","Shared account usage may include other sessions."]
  };
}

/** Merge a sparse update into a prior full read. Null means unknown and does not clear known metadata. */
export function mergeCodexRateLimitUpdate(fullRead, update) {
  if(!fullRead||typeof fullRead!=="object")throw new TypeError("a prior full rate-limit read is required");
  if(!update||typeof update!=="object")throw new TypeError("update must be an object");
  const merge=(a,b)=>{
    if(b===null||b===undefined)return structuredClone(a);
    if(Array.isArray(b)||typeof b!=="object")return b;
    const out=typeof a==="object"&&a&&!Array.isArray(a)?structuredClone(a):{};
    for(const [k,v] of Object.entries(b))out[k]=merge(out[k],v);
    return out;
  };
  return merge(fullRead,update.params||update);
}
