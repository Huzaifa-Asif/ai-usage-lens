const MAX_RECORDS = 50_000;
const MAX_RATES = 10_000;
const MAX_WINDOWS = 1_000;
const MAX_TEXT = 20_000;
const ALLOWED_CURRENCIES = /^[A-Z]{3}$/;

export class LedgerError extends Error {
  constructor(message, issues = []) { super(message); this.name = "LedgerError"; this.issues = issues; }
}
export function escapeHTML(value) { return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const nullableInt = (v, path, issues) => {
  if (v === null || v === undefined) return null;
  if (!Number.isSafeInteger(v) || v < 0) { issues.push(`${path} must be a non-negative safe integer or null`); return null; }
  return v;
};
const text = (v, path, issues, required = true) => {
  if (v === null || v === undefined || v === "") { if (required) issues.push(`${path} is required`); return ""; }
  if (typeof v !== "string") { issues.push(`${path} must be a string`); return ""; }
  if (v.length > MAX_TEXT) { issues.push(`${path} exceeds ${MAX_TEXT} characters`); return ""; }
  return v;
};

/** Normalize the documented Token Lens v1 envelope. Cumulative counters are rejected. */
export function normalizeLedger(raw) {
  const issues = [];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new LedgerError("Expected a JSON object");
  if (raw.schemaVersion !== "token-lens/v1") issues.push("schemaVersion must be token-lens/v1");
  if (raw.usageSemantics !== "per_request") issues.push("usageSemantics must be per_request; cumulative or unspecified snapshots are unsupported");
  if (!Array.isArray(raw.records)) issues.push("records must be an array");
  if (raw.records?.length > MAX_RECORDS) issues.push(`records exceeds ${MAX_RECORDS}`);
  if (issues.length) throw new LedgerError("Invalid ledger", issues);

  const records = [];
  const fingerprints = new Map();
  for (let i = 0; i < raw.records.length; i++) {
    const r = raw.records[i]; const p = `records[${i}]`; const ri = [];
    if (!r || typeof r !== "object" || Array.isArray(r)) { issues.push(`${p} must be an object`); continue; }
    const id = text(r.id, `${p}.id`, ri);
    const threadId = text(r.threadId, `${p}.threadId`, ri);
    const messageId = text(r.messageId, `${p}.messageId`, ri);
    const occurredAt = text(r.occurredAt, `${p}.occurredAt`, ri);
    if (occurredAt && !Number.isFinite(Date.parse(occurredAt))) ri.push(`${p}.occurredAt must be ISO-8601`);
    const model = text(r.model, `${p}.model`, ri);
    const inputTokens = nullableInt(r.usage?.inputTokens, `${p}.usage.inputTokens`, ri);
    const cachedInputTokens = nullableInt(r.usage?.cachedInputTokens, `${p}.usage.cachedInputTokens`, ri);
    const cacheWriteInputTokens = nullableInt(r.usage?.cacheWriteInputTokens, `${p}.usage.cacheWriteInputTokens`, ri);
    const outputTokens = nullableInt(r.usage?.outputTokens, `${p}.usage.outputTokens`, ri);
    const reasoningTokens = nullableInt(r.usage?.reasoningTokens, `${p}.usage.reasoningTokens`, ri);
    if (cachedInputTokens !== null && inputTokens !== null && cachedInputTokens > inputTokens) ri.push(`${p}.usage.cachedInputTokens cannot exceed inputTokens`);
    if (cacheWriteInputTokens !== null && inputTokens !== null && cacheWriteInputTokens > inputTokens) ri.push(`${p}.usage.cacheWriteInputTokens cannot exceed inputTokens`);
    if (cachedInputTokens !== null && cacheWriteInputTokens !== null && inputTokens !== null && cachedInputTokens + cacheWriteInputTokens > inputTokens) ri.push(`${p}: cached and cache-write input cannot exceed inputTokens`);
    if (reasoningTokens !== null && outputTokens !== null && reasoningTokens > outputTokens) ri.push(`${p}.usage.reasoningTokens cannot exceed outputTokens`);
    if (r.kind && !["model_response", "tool_result", "other"].includes(r.kind)) ri.push(`${p}.kind is invalid`);
    const record = {
      id, threadId, messageId, occurredAt, model,
      kind: r.kind || "model_response",
      usage: { inputTokens, cachedInputTokens, cacheWriteInputTokens, outputTokens, reasoningTokens },
      promptChars: nullableInt(r.promptChars, `${p}.promptChars`, ri),
      repeatedContextChars: nullableInt(r.repeatedContextChars, `${p}.repeatedContextChars`, ri),
      source: typeof r.source === "string" && r.source ? r.source.slice(0, 200) : "imported",
      accountNamespace: typeof r.accountNamespace === "string" && r.accountNamespace ? r.accountNamespace.slice(0, 200) : "default"
    };
    if (record.kind === "tool_result" && [inputTokens, outputTokens, cachedInputTokens, cacheWriteInputTokens, reasoningTokens].some(v => v !== null && v !== 0)) {
      ri.push(`${p}: tool_result cannot carry billable model usage automatically`);
    }
    const fp = JSON.stringify(record); const dedupKey=JSON.stringify([record.source,record.accountNamespace,id]);
    if (fingerprints.has(dedupKey) && fingerprints.get(dedupKey) !== fp) ri.push(`${p}.id conflicts within its source/account namespace`);
    if (!fingerprints.has(dedupKey)) { fingerprints.set(dedupKey, fp); records.push(record); }
    issues.push(...ri);
  }
  if (issues.length) throw new LedgerError("Invalid ledger", issues);
  return { schemaVersion: "token-lens/v1", usageSemantics: "per_request", records };
}

/** Accept a saved OpenAI Responses API object or array and require caller-owned thread mapping. */
export function adaptResponses(input, defaults = {}) {
  const rows = Array.isArray(input) ? input : [input];
  return normalizeLedger({ schemaVersion: "token-lens/v1", usageSemantics: "per_request", records: rows.map((r, i) => ({
    id: r.id || `response-${i}`,
    threadId: r.metadata?.thread_id || defaults.threadId || "unassigned",
    messageId: r.metadata?.message_id || r.id || `response-${i}`,
    occurredAt: r.created_at ? new Date(r.created_at * 1000).toISOString() : (defaults.occurredAt || new Date(0).toISOString()),
    model: r.model || defaults.model || "unknown",
    kind: "model_response",
    usage: {
      inputTokens: r.usage?.input_tokens ?? null,
      cachedInputTokens: r.usage?.input_tokens_details?.cached_tokens ?? null,
      cacheWriteInputTokens: r.usage?.input_tokens_details?.cache_write_tokens ?? null,
      outputTokens: r.usage?.output_tokens ?? null,
      reasoningTokens: r.usage?.output_tokens_details?.reasoning_tokens ?? null
    }, source: "openai-responses-object", accountNamespace: defaults.accountNamespace || "default"
  })) });
}

export function normalizePrices(raw) {
  const issues = [];
  if (!raw || raw.schemaVersion !== "token-lens/prices-v1" || !Array.isArray(raw.rates)) throw new LedgerError("Invalid price table", ["Expected token-lens/prices-v1 rates array"]);
  if(raw.rates.length>MAX_RATES)throw new LedgerError("Invalid price table",[`rates exceeds ${MAX_RATES}`]);
  const rates = raw.rates.map((r, i) => {
    const p = `rates[${i}]`; const currency = text(r.currency, `${p}.currency`, issues).toUpperCase();
    if (currency && !ALLOWED_CURRENCIES.test(currency)) issues.push(`${p}.currency must be a 3-letter code`);
    const effectiveFrom = text(r.effectiveFrom, `${p}.effectiveFrom`, issues);
    const parsedDate=Date.parse(`${effectiveFrom}T00:00:00Z`);
    if (effectiveFrom && (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom)||!Number.isFinite(parsedDate)||new Date(parsedDate).toISOString().slice(0,10)!==effectiveFrom)) issues.push(`${p}.effectiveFrom must be a real YYYY-MM-DD date`);
    const n = k => { const v = r[k]; if (v === null || v === undefined) return null; if (typeof v !== "number" || !Number.isFinite(v) || v < 0) { issues.push(`${p}.${k} must be a non-negative number or null`); return null; } return v; };
    return { model: text(r.model, `${p}.model`, issues), currency, effectiveFrom, provenance: text(r.provenance, `${p}.provenance`, issues), inputPerMillion: n("inputPerMillion"), cachedInputPerMillion: n("cachedInputPerMillion"), cacheWriteInputPerMillion: n("cacheWriteInputPerMillion"), outputPerMillion: n("outputPerMillion") };
  });
  const rateKeys=new Set();for(const r of rates){const k=JSON.stringify([r.model,r.effectiveFrom]);if(rateKeys.has(k))issues.push(`duplicate rate for ${r.model} on ${r.effectiveFrom}`);rateKeys.add(k);}
  if (issues.length) throw new LedgerError("Invalid price table", issues);
  return { schemaVersion: "token-lens/prices-v1", rates };
}

function selectRate(record, rates) {
  const date = record.occurredAt.slice(0, 10);
  return rates.filter(r => r.model === record.model && r.effectiveFrom <= date).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0] || null;
}

export function estimateRecord(record, priceTable) {
  if (record.kind !== "model_response") return { status: "not_billable", amount: null, currency: null, rate: null };
  const u = record.usage; const rate = selectRate(record, priceTable.rates);
  if (!rate) return { status: "unknown_price", amount: null, currency: null, rate: null };
  if (u.inputTokens === null || u.outputTokens === null) return { status: "missing_usage", amount: null, currency: rate.currency, rate };
  const cached = u.cachedInputTokens ?? 0;
  const cacheWrite = u.cacheWriteInputTokens ?? 0;
  if (cached > 0 && rate.cachedInputPerMillion === null) return { status: "unknown_price", amount: null, currency: rate.currency, rate };
  if (cacheWrite > 0 && rate.cacheWriteInputPerMillion === null) return { status: "unknown_price", amount: null, currency: rate.currency, rate };
  if (u.inputTokens - cached - cacheWrite > 0 && rate.inputPerMillion === null) return { status: "unknown_price", amount: null, currency: rate.currency, rate };
  if (u.outputTokens > 0 && rate.outputPerMillion === null) return { status: "unknown_price", amount: null, currency: rate.currency, rate };
  const amount = ((u.inputTokens - cached - cacheWrite) * (rate.inputPerMillion || 0) + cached * (rate.cachedInputPerMillion || 0) + cacheWrite * (rate.cacheWriteInputPerMillion || 0) + u.outputTokens * (rate.outputPerMillion || 0)) / 1_000_000;
  if(!Number.isFinite(amount))return {status:"unknown_price",amount:null,currency:rate.currency,rate:null};
  return { status: "estimated", amount, currency: rate.currency, rate };
}

export function analyze(ledger, priceTable) {
  const groups = new Map();
  const total = blank("All threads");
  for (const record of ledger.records) {
    const cost = estimateRecord(record, priceTable);
    const enriched = { ...record, cost };
    const groupKey=JSON.stringify([record.source,record.accountNamespace,record.threadId]);
    if (!groups.has(groupKey)) groups.set(groupKey, {...blank(record.threadId),groupKey,scope:`${record.source} · ${record.accountNamespace}`});
    add(total, enriched); add(groups.get(groupKey), enriched);
  }
  return { total: finish(total), threads: [...groups.values()].map(finish).sort((a,b) => (b.tokens.knownTotal - a.tokens.knownTotal)), records: ledger.records.map(r => ({ ...r, cost: estimateRecord(r, priceTable) })) };
}
function blank(id) { return { id, records: [], tokens: { input: 0, cached: 0, cacheWrite: 0, output: 0, reasoning: 0, knownTotal: 0 }, missing: 0, costs: {}, unknownPrice: 0, notBillable: 0 }; }
function add(g, r) {
  g.records.push(r); const u = r.usage;
  if (r.kind === "model_response") {
    if (u.inputTokens === null || u.outputTokens === null) g.missing++;
    for (const [k, field] of [["input","inputTokens"],["cached","cachedInputTokens"],["cacheWrite","cacheWriteInputTokens"],["output","outputTokens"],["reasoning","reasoningTokens"]]) g.tokens[k] += u[field] || 0;
    g.tokens.knownTotal += (u.inputTokens || 0) + (u.outputTokens || 0);
  }
  if (r.cost.status === "estimated") g.costs[r.cost.currency] = (g.costs[r.cost.currency] || 0) + r.cost.amount;
  if (r.cost.status === "unknown_price") g.unknownPrice++;
  if (r.cost.status === "not_billable") g.notBillable++;
}
function finish(g) { return { ...g, rate: g.tokens.input ? g.tokens.cached / g.tokens.input : null }; }

export function suggestions(analysis) {
  const out = [];
  const records = analysis.records.filter(r => r.kind === "model_response");
  const input = records.reduce((n,r) => n + (r.usage.inputTokens || 0), 0);
  const output = records.reduce((n,r) => n + (r.usage.outputTokens || 0), 0);
  const cached = records.reduce((n,r) => n + (r.usage.cachedInputTokens || 0), 0);
  if (input > output * 3) out.push({ id:"trim-context", title:"Trim repeated context", evidence:`Input is ${ratio(input, output)}× output across measured requests.`, guidance:"Keep stable instructions first, remove duplicate history, and attach only relevant excerpts. Preserve requirements and safety constraints.", context:"Prefer concise relevant context. Do not remove requirements, constraints, evidence, or safety instructions." });
  if (input >= 1000 && cached / input < .25) out.push({ id:"cache-prefix", title:"Stabilize reusable prefixes", evidence:`Only ${Math.round(cached/input*100)}% of measured input was reported cached.`, guidance:"For supported API workflows, place identical reusable instructions and examples at the beginning. Caching is automatic and not guaranteed.", context:"When using an API workflow, keep genuinely reusable instructions in a stable prefix; do not alter task-specific details." });
  if (output > 2000) out.push({ id:"cap-output", title:"Ask for a tighter answer", evidence:`Measured output totals ${output.toLocaleString()} tokens.`, guidance:"State the desired format and length; in an API workflow, consider a supported output-token cap after testing truncation risk.", context:"Be concise, lead with the result, and stop after the requested deliverable unless detail is necessary." });
  if (analysis.total.unknownPrice) out.push({ id:"complete-prices", title:"Complete the price table", evidence:`${analysis.total.unknownPrice} response(s) have no applicable rate.`, guidance:"Add a dated rate with provenance. Do not treat unknown cost as zero.", context:"No prompt change—update Token Lens pricing data first." });
  if (analysis.total.missing) out.push({ id:"capture-usage", title:"Capture response usage", evidence:`${analysis.total.missing} response(s) lack input or output counts.`, guidance:"Save documented response usage fields in the controlled workflow. Do not estimate missing counts from text length.", context:"No prompt change—capture supported usage metadata in the calling application." });
  return out;
}
const ratio = (a,b) => b ? (a/b).toFixed(1) : "∞";

export function buildGuidance(selected, mode = "checklist") {
  const lines = selected.map(s => s.context).filter(Boolean);
  if (!lines.length) return "No optimization guidance selected.";
  if (mode === "codex-context") return JSON.stringify({ hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: lines.join("\n") } }, null, 2);
  return lines.map((x,i) => `${i+1}. ${x}`).join("\n");
}

export function normalizeQuotaSnapshot(raw) {
  const issues=[];
  if(!raw||raw.schemaVersion!=="token-lens/quotas-v1"||!Array.isArray(raw.windows)) throw new LedgerError("Invalid quota snapshot",["Expected token-lens/quotas-v1 windows array"]);
  if(raw.windows.length>MAX_WINDOWS)throw new LedgerError("Invalid quota snapshot",[`windows exceeds ${MAX_WINDOWS}`]);
  const capturedAt=text(raw.capturedAt,"capturedAt",issues); if(capturedAt&&!Number.isFinite(Date.parse(capturedAt)))issues.push("capturedAt must be ISO-8601");
  const source=text(raw.source,"source",issues);
  const allowed=raw.ordinaryUsageAllowed;if(allowed!==undefined&&allowed!==null&&typeof allowed!=="boolean")issues.push("ordinaryUsageAllowed must be boolean or null");
  const windows=raw.windows.map((w,i)=>{ const p=`windows[${i}]`; const pct=k=>{const v=w[k];if(v===null||v===undefined)return null;if(typeof v!=="number"||!Number.isFinite(v)||v<0||v>100){issues.push(`${p}.${k} must be 0..100 or null`);return null;}return v;}; const usedPercent=pct("usedPercent"),remainingPercent=pct("remainingPercent"); if(usedPercent!==null&&remainingPercent!==null&&Math.abs(usedPercent+remainingPercent-100)>.1)issues.push(`${p} reported percentages do not sum to 100`); const resetsAt=w.resetsAt==null?null:text(w.resetsAt,`${p}.resetsAt`,issues); if(resetsAt&&!Number.isFinite(Date.parse(resetsAt)))issues.push(`${p}.resetsAt must be ISO-8601 or null`); return {id:text(w.id,`${p}.id`,issues),label:text(w.label,`${p}.label`,issues),usedPercent,remainingPercent,windowDurationMinutes:nullableInt(w.windowDurationMinutes,`${p}.windowDurationMinutes`,issues),resetsAt,spendControlReached:typeof w.spendControlReached==="boolean"?w.spendControlReached:null,rateLimitReachedType:typeof w.rateLimitReachedType==="string"?w.rateLimitReachedType:null,note:typeof w.note==="string"?w.note.slice(0,500):""};});
  if(issues.length)throw new LedgerError("Invalid quota snapshot",issues);
  return {schemaVersion:"token-lens/quotas-v1",capturedAt,source,ordinaryUsageAllowed:typeof allowed==="boolean"?allowed:null,unvaluedBalances:raw.unvaluedBalances&&typeof raw.unvaluedBalances==="object"?{hasCredits:raw.unvaluedBalances.hasCredits??null,unlimited:raw.unvaluedBalances.unlimited??null,balance:raw.unvaluedBalances.balance==null?null:String(raw.unvaluedBalances.balance),unit:"unspecified"}:null,windows};
}

export function quotaSuggestions(snapshot, now = Date.now()) {
  return snapshot.windows.flatMap((w,index)=>{
    const status=quotaWindowStatus(w,snapshot.capturedAt,now);
    if(status.state==="refresh_required")return [{id:`refresh-window-${index}`,title:`Refresh the ${w.label} snapshot`,evidence:"The reported reset time has passed, so this snapshot is stale.",guidance:"Fetch a new authorized rate-limit read before deciding whether ordinary usage is available. Expiry alone does not prove restoration.",context:"Quota evidence is stale. Ask the user to refresh the authorized rate-limit snapshot before making quota-sensitive decisions."}];
    const remaining=w.remainingPercent ?? (w.usedPercent===null?null:100-w.usedPercent);
    if(remaining===null||remaining>10)return [];
    return [{id:`quota-window-${index}`,title:`Protect the ${w.label} window`,evidence:`Provider snapshot reports ${remaining.toFixed(1)}% remaining${w.resetsAt?` until ${w.resetsAt}`:"; reset time unavailable"}.`,guidance:"Batch related work, start with a compact plan, reuse stable context, and reserve high-effort runs for tasks where quality justifies the quota. This does not imply a fixed token allowance.",context:"A provider-reported quota window is low. Work in a compact plan, avoid redundant exploration, and preserve task requirements."}];
  });
}

export function quotaWindowStatus(window, observedAt, now = Date.now()) {
  if (!window.resetsAt) return { state:"unknown_reset", label:"Reset unavailable" };
  const reset=Date.parse(window.resetsAt), observed=Date.parse(observedAt);
  if (!Number.isFinite(reset)||!Number.isFinite(observed)) return {state:"invalid",label:"Invalid timestamp"};
  if (reset <= now) return {state:"refresh_required",label:"Snapshot expired — refresh required"};
  return {state:"active_snapshot",label:`Resets ${new Date(reset).toLocaleString()}`};
}
