# Offline CLI import

Use the normalized `token-lens/v1` envelope with `usageSemantics: "per_request"` and `records`, plus a `token-lens/prices-v1` rate table. See the bundled `examples/ledger.json`, `examples/prices.json`, `schemas/ledger.schema.json` and `schemas/prices.schema.json` for exact fields.

Each model response has stable source/account/request IDs, application-owned thread/message IDs, ISO-8601 time, model and nullable input/cached-input/output/reasoning counts. Cached input is within input; reasoning is within output. Tool results are not automatically billable model responses. Identical IDs deduplicate; conflicting duplicates and unsupported cumulative semantics are rejected.

Rate rows identify model, currency, `YYYY-MM-DD` effective date, per-million rates and provenance. The latest applicable dated rate is selected. Currency totals stay separate; unknown prices and missing counts are not zero or invoices. Synthetic rates are not current provider prices.

Limits: 10 MB per file, 50,000 records, 20,000-character text fields. CLI output arrays cap at 100 with explicit omitted counts and exact aggregate totals. It emits no individual records or retained ledger file. There are no provider-response, Codex event, quota or account collectors in this package; use the separate full application for those supported import adapters and complete request drill-down.
