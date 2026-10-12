# Import and adapter guide

## Normalized ledger

The browser accepts one JSON object:

```json
{
  "schemaVersion": "token-lens/v1",
  "usageSemantics": "per_request",
  "records": [{
    "id": "stable-request-id",
    "threadId": "app-owned-thread-id",
    "messageId": "app-owned-message-or-turn-id",
    "occurredAt": "2026-10-12T04:00:00Z",
    "model": "exact-model-name",
    "kind": "model_response",
    "usage": {
      "inputTokens": 1000,
      "cachedInputTokens": 400,
      "cacheWriteInputTokens": null,
      "outputTokens": 200,
      "reasoningTokens": 50
    },
    "source": "my-response-capture"
  }]
}
```

Use `null`, not `0`, for unavailable values. Cached and cache-write input are non-overlapping subsets of `inputTokens`; `reasoningTokens` is a subset/detail of `outputTokens`. `usageSemantics: "cumulative"` is rejected. Identical duplicate IDs are removed within a source/account namespace, while conflicts in that namespace are rejected.

For `kind: "tool_result"`, every usage value must be `null` or `0`. A tool call can cause later model usage, but the tool output itself is not automatically priced as a model response.

## Price table

```json
{
  "schemaVersion": "token-lens/prices-v1",
  "rates": [{
    "model": "exact-model-name",
    "currency": "USD",
    "effectiveFrom": "2026-10-01",
    "inputPerMillion": 2.00,
    "cachedInputPerMillion": 0.20,
    "outputPerMillion": 8.00,
    "provenance": "URL or contract revision"
  }]
}
```

AI Usage Lens selects the latest matching rate not later than the record date. It does not convert currencies. Missing rates remain unknown. Keep a provider URL, contract identifier, or internal approval note in `provenance`; do not assume the synthetic demo rates are real.

## Responses API adapter

`adaptResponses()` maps a saved response object's documented `usage.input_tokens`, `input_tokens_details.cached_tokens`, `output_tokens`, and `output_tokens_details.reasoning_tokens`. Supply application-owned thread/message IDs in response metadata or adapter defaults. The adapter does not fetch responses or accept a key.

## Codex App Server adapter

`normalizeCodexTokenSnapshots()` accepts already captured, explicitly authorized `thread/tokenUsage/updated` JSON-RPC notifications. It retains only the latest captured cumulative snapshot for each source/account/thread namespace. It preserves `total` as cumulative evidence and `last` only as the latest appended usage—never a whole turn or message charge. Snapshots are not summed, and the first mid-thread snapshot includes historical, unattributed usage. It does not read transcript files.

`normalizeCodexAccountActivity()` keeps lifetime/daily ChatGPT token activity separate from the request ledger because it is not per-message billing. The import adapter does not start App Server or perform authentication. The separate, optional collector documented in `CODEX_COLLECTOR.md` may start an already authenticated local App Server only after an explicit `--live` invocation.

If that response includes `threadUsage`, provider-estimated credit micros and nullable USD micros are retained as `provider_estimate_not_invoice`. They remain separate from local rate-card estimates and actual invoices.

`normalizeCodexRateLimits()` converts a full authorized `account/rateLimits/read` response. It prefers `rateLimitsByLimitId` over the legacy bucket so data is not counted twice, preserves unknown permission state, timestamps the snapshot, and keeps credit balances unitless. Sparse update notifications should be merged only against a known full read or followed by a fresh read.

## Limits

- Browser imports: 10 MB per file.
- Normalized records: 50,000.
- Text fields: 20,000 characters.
- Dates: ISO-8601 record timestamps and `YYYY-MM-DD` effective dates.
- JSON only; malformed data is rejected without partial import.

## Subscription quota snapshots

Use `token-lens/quotas-v1` for provider-reported windows. Each window may contain `usedPercent`, `remainingPercent`, `windowDurationMinutes`, and `resetsAt`; unavailable values stay `null`. AI Usage Lens does not invent daily, weekly, or monthly windows and does not infer a fixed token allowance from a percentage. See `examples/quotas.json`.
