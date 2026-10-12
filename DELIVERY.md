# AI Usage Lens MVP delivery — 2026-10-12

Product name finalized as **AI Usage Lens**. The focused rename passed 55/55 checks and independent review. Legacy `token-lens` data schemas, browser storage key, package/client identities, skill path, and archive filenames remain compatible; the existing Library identities are updated in place.

## Delivered

- Local static dashboard with thread, request, optimization, subscription-limit, and scope views.
- Browser imports for normalized request ledger, dated price table, and provider-reported quota snapshot.
- Optional explicit read-only Codex App Server stdio collector with strict account-read allowlist; disabled by default and tested only with a stub.
- Shared validation/pricing/aggregation core, terminal CLI, Responses adapter, safe Codex cumulative-snapshot/account-activity/rate-limit adapters, and local Codex skill.
- Synthetic demo, JSON schemas, import/architecture/privacy/security/support/governance documentation.

## Verification

- `npm run check`: passed with 55/55 tests, including streaming overflow cancellation, direct bridge output bounds, error sanitization, and injected end-to-end checks.
- `npm run cli -- examples/ledger.json examples/prices.json`: passed; reported 1,200 measured tokens and USD 0.00288 example-only estimate.
- Non-socket static handler checks passed for app/demo assets, CSP, malformed URLs, and traversal rejection. Full browser smoke check was not run because the managed sandbox rejected loopback binding with `listen EPERM 127.0.0.1:4173`. No approval request was made.

## Honest limitations

- No real provider/account connection or API call was exercised during development. The optional explicit collector can query an already authenticated local Codex App Server, but performs no login, credential storage, transcript access, deployment, publishing, or hook installation.
- The UI makes this one-shot Codex connection its primary path and exposes permission, waiting, connected snapshot, expired/reconnect, cancelled, unavailable, and error states. Browser visual execution remained blocked by the loopback restriction; UI wiring was syntax-checked and the state model was unit-tested.
- A bounded OpenAI organization Admin API CLI collector is included. It requires an environment-provided Admin API key, uses only two fixed official GET endpoints, rejects redirects, and emits aggregate audit data separately from the request ledger. No real credential or request was used.
- Direct local journey: the loopback server accepts explicit same-origin POST actions only after strict Host/Origin checks, invokes the bounded collectors, and returns Codex quotas or separately rendered Admin aggregates without file selection. CLI capture/import remains fallback. No background sync, automatic login, or persistent access is shipped.
- Codex token events remain cumulative snapshots and are not attributed to messages; `last` is not treated as a whole turn.
- ChatGPT/Codex subscription activity is never converted to claimed API billing.
- Selected optimizations generate user-applied guidance or Codex developer-context preview only; they do not replace prompts or globally alter settings.
- Rate limits are a timestamped snapshot. Missing windows and permission state remain unavailable/unknown; expiry does not prove restoration.
- Workspace policy blocked creating `.git`; a recoverable local Git bundle is delivered instead, with its exact commit recorded in the final handoff.
