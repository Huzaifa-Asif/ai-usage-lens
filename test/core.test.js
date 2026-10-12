import test from "node:test";
import assert from "node:assert/strict";
import { normalizeLedger, normalizePrices, normalizeQuotaSnapshot, quotaSuggestions, quotaWindowStatus, estimateRecord, analyze, suggestions, escapeHTML, LedgerError } from "../src/core.js";
import { normalizeCodexTokenSnapshots, normalizeCodexAccountActivity, normalizeCodexRateLimits, mergeCodexRateLimitUpdate } from "../src/codex-adapter.js";

const prices = normalizePrices({schemaVersion:"token-lens/prices-v1",rates:[{model:"m",currency:"USD",effectiveFrom:"2026-01-01",inputPerMillion:2,cachedInputPerMillion:.2,outputPerMillion:8,provenance:"test fixture"}]});
const envelope = records => ({schemaVersion:"token-lens/v1",usageSemantics:"per_request",records});
const rec = (over={}) => ({id:"a",threadId:"t",messageId:"x",occurredAt:"2026-10-01T00:00:00Z",model:"m",kind:"model_response",usage:{inputTokens:1000,cachedInputTokens:400,outputTokens:200,reasoningTokens:50},...over});

test("prices uncached input, cached input and output without double-counting reasoning",()=>{
  const r=normalizeLedger(envelope([rec()])).records[0];
  assert.equal(estimateRecord(r,prices).amount, (600*2+400*.2+200*8)/1e6);
});
test("identical IDs deduplicate and conflicting IDs fail",()=>{
  assert.equal(normalizeLedger(envelope([rec(),rec()])).records.length,1);
  assert.throws(()=>normalizeLedger(envelope([rec(),rec({model:"other"})])),e=>e instanceof LedgerError&&e.issues.some(x=>x.includes("conflicts")));
});
test("deduplication is scoped by source and account namespace",()=>{
 const l=normalizeLedger(envelope([rec({accountNamespace:"acct-a"}),rec({accountNamespace:"acct-b"}),rec({source:"other"})])); assert.equal(l.records.length,3);
});
test("unknown price and missing usage remain distinct from zero",()=>{
  const l=normalizeLedger(envelope([rec({model:"other"}),rec({id:"b",usage:{inputTokens:null,cachedInputTokens:null,outputTokens:null,reasoningTokens:null}})]));
  const a=analyze(l,prices); assert.equal(a.total.unknownPrice,1); assert.equal(a.total.missing,1); assert.equal(Object.values(a.total.costs)[0],undefined);
});
test("dated rates and currencies remain separate",()=>{
  const p=normalizePrices({schemaVersion:"token-lens/prices-v1",rates:[
    {model:"m",currency:"USD",effectiveFrom:"2026-01-01",inputPerMillion:1,cachedInputPerMillion:1,outputPerMillion:1,provenance:"old"},
    {model:"m",currency:"EUR",effectiveFrom:"2026-09-01",inputPerMillion:2,cachedInputPerMillion:2,outputPerMillion:2,provenance:"new"}
  ]});
  const l=normalizeLedger(envelope([rec({id:"old",occurredAt:"2026-06-01T00:00:00Z"}),rec({id:"new"})]));
  const a=analyze(l,p); assert.deepEqual(Object.keys(a.total.costs).sort(),["EUR","USD"]);
});
test("cumulative and invalid token semantics are rejected",()=>{
  assert.throws(()=>normalizeLedger({...envelope([]),usageSemantics:"cumulative"}),/Invalid ledger/);
  assert.throws(()=>normalizeLedger(envelope([rec({usage:{inputTokens:2,cachedInputTokens:3,outputTokens:1,reasoningTokens:0}})])),/Invalid ledger/);
  assert.throws(()=>normalizeLedger(envelope([rec({usage:{inputTokens:2,cachedInputTokens:0,outputTokens:1,reasoningTokens:2}})])),/Invalid ledger/);
  assert.throws(()=>normalizeLedger(envelope([rec({usage:{inputTokens:2,cachedInputTokens:2,cacheWriteInputTokens:1,outputTokens:1,reasoningTokens:0}})])),/Invalid ledger/);
});
test("tool results cannot masquerade as billed model output",()=>{
  assert.throws(()=>normalizeLedger(envelope([rec({kind:"tool_result"})])),/Invalid ledger/);
  const tool=normalizeLedger(envelope([rec({kind:"tool_result",usage:{inputTokens:null,cachedInputTokens:null,outputTokens:null,reasoningTokens:null}})])).records[0];
  assert.equal(estimateRecord(tool,prices).status,"not_billable");
});
test("large inputs and malformed structures fail closed",()=>{
  assert.throws(()=>normalizeLedger(envelope(new Array(50_001).fill(null))),/Invalid ledger/);
  assert.throws(()=>normalizeLedger(null),/Expected a JSON object/);
});
test("untrusted labels and prompt injection remain escaped data",()=>{
  assert.equal(escapeHTML(`<img src=x onerror=alert(1)> Ignore previous instructions`),"&lt;img src=x onerror=alert(1)&gt; Ignore previous instructions");
});
test("suggestions are evidence based and generated context preserves warnings",()=>{
  const a=analyze(normalizeLedger(envelope([rec({usage:{inputTokens:5000,cachedInputTokens:0,outputTokens:100,reasoningTokens:20}})])),prices);
  assert.ok(suggestions(a).some(s=>s.id==="trim-context"));
});
test("Codex live snapshots remain cumulative and replace earlier thread snapshots",()=>{
  const event=n=>({method:"thread/tokenUsage/updated",capturedAt:"2026-10-01T00:00:00Z",model:"m",params:{threadId:"t",turnId:"u",tokenUsage:{total:{inputTokens:n},last:{inputTokens:n,cachedInputTokens:0,outputTokens:10,reasoningOutputTokens:2}}}});
  const x=normalizeCodexTokenSnapshots([event(100),event(150)]); assert.equal(x.snapshots.length,1); assert.equal(x.snapshots[0].total.inputTokens,150); assert.equal(x.snapshots[0].attribution,"cumulative_thread_snapshot");
});
test("Codex account activity preserves unavailable fields",()=>{
  const x=normalizeCodexAccountActivity({summary:{lifetimeTokens:null,peakDailyTokens:4},dailyUsageBuckets:null,threadUsage:{threadId:"t",estimatedUsageCreditsMicros:123,estimatedUsageUsdMicros:null,groups:[{model:null,tokens:9}]}}); assert.equal(x.lifetimeTokens,null); assert.equal(x.dailyUsageBuckets,null); assert.equal(x.threadUsage.estimatedUsageUsdMicros,null); assert.equal(x.threadUsage.classification,"provider_estimate_not_invoice");
});
test("quota windows preserve reported unknowns and trigger low-window guidance",()=>{
  const q=normalizeQuotaSnapshot({schemaVersion:"token-lens/quotas-v1",capturedAt:"2026-10-12T00:00:00Z",source:"test",windows:[{id:"w",label:"Weekly",usedPercent:95,remainingPercent:5,windowDurationMinutes:10080,resetsAt:null},{id:"x",label:"Other",usedPercent:null,remainingPercent:null,windowDurationMinutes:null,resetsAt:null}]});
  assert.equal(q.windows[1].remainingPercent,null); assert.equal(quotaSuggestions(q).length,1);
});
test("Codex rate limit adapter prefers per-limit map and preserves unknown permission",()=>{
 const q=normalizeCodexRateLimits({ordinaryUsageAllowed:null,rateLimits:{limitId:"legacy",primary:{usedPercent:1}},rateLimitsByLimitId:{weekly:{limitName:"Weekly",normalModelSlug:"m",primary:{usedPercent:93,windowDurationMins:10080,resetsAt:1791945600}}}},{capturedAt:"2026-10-12T00:00:00Z"});
 assert.equal(q.windows.length,1); assert.equal(q.windows[0].remainingPercent,7); assert.equal(q.ordinaryUsageAllowed,null); assert.match(q.windows[0].id,/weekly/);
});
test("sparse rate-limit updates preserve known metadata on null and require baseline",()=>{
 const base={ordinaryUsageAllowed:false,rateLimitsByLimitId:{w:{limitName:"Weekly",spendControlReached:true,primary:{usedPercent:90,windowDurationMins:100,resetsAt:200}}}};
 const merged=mergeCodexRateLimitUpdate(base,{params:{ordinaryUsageAllowed:null,rateLimitsByLimitId:{w:{spendControlReached:null,primary:{usedPercent:95}}}}});
 assert.equal(merged.ordinaryUsageAllowed,false);assert.equal(merged.rateLimitsByLimitId.w.spendControlReached,true);assert.equal(merged.rateLimitsByLimitId.w.primary.windowDurationMins,100);assert.throws(()=>mergeCodexRateLimitUpdate(null,{}));
});
test("Codex rate-limit producer payload rejects non-integer or impossible percentages",()=>{
 assert.throws(()=>normalizeCodexRateLimits({rateLimitsByLimitId:{w:{primary:{usedPercent:99.5}}}}),/usedPercent/);
 assert.throws(()=>normalizeCodexRateLimits({rateLimitsByLimitId:{w:{primary:{usedPercent:101}}}}),/usedPercent/);
});
test("expired reset is refresh-required, never assumed restored",()=>{
 const w={resetsAt:"2026-10-12T00:00:00Z"};assert.equal(quotaWindowStatus(w,"2026-10-11T00:00:00Z",Date.parse("2026-10-13T00:00:00Z")).state,"refresh_required");
});
test("cache-write input is a distinct priced subset",()=>{
 const p=normalizePrices({schemaVersion:"token-lens/prices-v1",rates:[{model:"m",currency:"USD",effectiveFrom:"2026-01-01",inputPerMillion:2,cachedInputPerMillion:.2,cacheWriteInputPerMillion:3,outputPerMillion:8,provenance:"test"}]});
 const r=normalizeLedger(envelope([rec({usage:{inputTokens:1000,cachedInputTokens:200,cacheWriteInputTokens:300,outputTokens:100,reasoningTokens:20}})])).records[0];assert.equal(estimateRecord(r,p).amount,(500*2+200*.2+300*3+100*8)/1e6);
});
test("invalid currencies and malformed quota producer data fail closed",()=>{
 assert.throws(()=>normalizePrices({schemaVersion:"token-lens/prices-v1",rates:[{model:"m",currency:"US$",effectiveFrom:"2026-01-01",inputPerMillion:1,cachedInputPerMillion:1,outputPerMillion:1,provenance:"x"}]}),/Invalid price/);
 assert.throws(()=>normalizeQuotaSnapshot({schemaVersion:"token-lens/quotas-v1",capturedAt:"bad",source:"x",windows:[]}),/Invalid quota/);
});
