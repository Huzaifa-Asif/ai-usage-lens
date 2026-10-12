# AI Usage Lens MVP delivery — 2026-10-12

Product name finalized as **AI Usage Lens**. The focused rename passed 55/55 checks and independent review. Legacy `token-lens` data schemas, browser storage key, package/client identities, skill path, and archive filenames remain compatible; the existing Library identities are updated in place.

## Delivered

- Public source: https://github.com/Huzaifa-Asif/ai-usage-lens . Deployment handoff uses only generated `dist-hosted/`; the local companion stays on the user's computer.

- Release preparation adds separate account token-activity rendering, accurate empty request-ledger messaging, hidden quota account identifiers, and a static hosting artifact whose collector actions are disabled.
- Signed-in Codex access remains in the loopback local companion. Hosted users can analyze demo/imported data; hosting does not provide universal session access. Directory eligibility is separate and no submission acceptance is claimed.

- Local static dashboard with thread, request, optimization, subscription-limit, and scope views.
- Browser imports for normalized request ledger, dated price table, and provider-reported quota snapshot.
- Optional explicit read-only Codex App Server stdio collector with strict account-read allowlist; disabled until an explicit action, with automated stub tests and separately authorized live quota verification.
- Shared validation/pricing/aggregation core, terminal CLI, Responses adapter, safe Codex cumulative-snapshot/account-activity/rate-limit adapters, and local Codex skill.
- Synthetic demo, JSON schemas, import/architecture/privacy/security/support/governance documentation.

## Verification

- `npm run check`: passed with 59/59 tests, including streaming overflow cancellation, direct bridge output bounds, account presentation/redaction, and hosted artifact separation.
- `npm run cli -- examples/ledger.json examples/prices.json`: passed; reported 1,200 measured tokens and USD 0.00288 example-only estimate.
- Initial sandbox listening was blocked. A later approved Google Chrome check used official CLI 0.162.1 and existing ChatGPT sign-in, exercised the direct dashboard path, and rendered a live quota snapshot. The release's new account presentation is verified with synthetic tests; no additional account call or concurrent browser use was performed.
- Independent final release review: PASS; 59/59 checks and static build verified without credentials or live calls.

## Honest limitations

- The local collector queries an already authenticated Codex App Server through supported account reads. It performs no login, credential extraction, transcript access, prompt execution, or hook installation. Real Admin API reporting remains unverified because no key was provisioned.
- The UI exposes permission, waiting, connected snapshot, expired/reconnect, cancelled, unavailable, and error states. Account summaries are separate from request-ledger totals; missing activity remains unavailable.
- A bounded OpenAI organization Admin API CLI collector is included. It requires an environment-provided Admin API key, uses only two fixed official GET endpoints, rejects redirects, and emits aggregate audit data separately from the request ledger. No real credential or request was used.
- Direct local journey: the loopback server accepts explicit same-origin POST actions only after strict Host/Origin checks, invokes the bounded collectors, and returns Codex quotas or separately rendered Admin aggregates without file selection. CLI capture/import remains fallback. No background sync, automatic login, or persistent access is shipped.
- Codex token events remain cumulative snapshots and are not attributed to messages; `last` is not treated as a whole turn.
- ChatGPT/Codex subscription activity is never converted to claimed API billing.
- Selected optimizations generate user-applied guidance or Codex developer-context preview only; they do not replace prompts or globally alter settings.
- Rate limits are a timestamped snapshot. Missing windows and permission state remain unavailable/unknown; expiry does not prove restoration.
- Workspace policy blocked creating `.git`; a recoverable local Git bundle is delivered instead, with its exact commit recorded in the final handoff.
