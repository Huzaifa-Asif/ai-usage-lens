import {escapeHTML} from './core.js';
const count=value=>Number.isSafeInteger(value)&&value>=0?value.toLocaleString():'Unavailable';
export function accountActivityHTML(activity){
 if(!activity)return '<p>Account token activity unavailable. Quota data may still be available.</p>';
 const buckets=Array.isArray(activity.dailyUsageBuckets)?activity.dailyUsageBuckets:[];
 return `<p>Provider account activity; shared sessions may contribute. These counts are not request-level billing.</p><div class="metrics"><article><small>Lifetime tokens</small><strong>${count(activity.lifetimeTokens)}</strong></article><article><small>Peak daily tokens</small><strong>${count(activity.peakDailyTokens)}</strong></article></div><h3>Daily activity</h3>${buckets.length?`<table><thead><tr><th>Date</th><th>Tokens</th></tr></thead><tbody>${buckets.map(b=>`<tr><td>${escapeHTML(String(b.startDate))}</td><td>${count(b.tokens)}</td></tr>`).join('')}</tbody></table>`:'<p>Daily activity unavailable.</p>'}<p>Per-thread and per-message attribution requires separately instrumented request records. Account summaries are never distributed across unseen messages.</p>`;
}
export function requestLedgerNotice({connected=false,hasLedger=false}={}){return hasLedger?'Request ledger loaded.':connected?'Account/quota capture connected; activity may be unavailable. No request ledger loaded; per-thread/message analysis remains unavailable.':'No request ledger loaded. Connect locally for account activity and quotas, or load the synthetic demo.';}
export function quotaSourceLabel(source){return String(source).startsWith('Codex App Server')?'Codex App Server · account identifier hidden':String(source).replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,'[identifier hidden]');}
