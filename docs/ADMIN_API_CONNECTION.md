# OpenAI organization Admin API connection checkpoint

OpenAI documents read-only organization aggregates at `GET /v1/organization/usage/completions` and `GET /v1/organization/costs`. They require an organization Admin API key; an ordinary project key or ChatGPT sign-in is not a substitute. Usage buckets can be grouped and paginated, while costs are daily aggregates. Neither endpoint can retrospectively produce per-thread or per-message attribution.

Token Lens ships a local CLI connector using an environment-provided key and a fixed two-endpoint GET allowlist. It rejects redirects, bounds pagination/results/time, supports cancellation, and reports sanitized configured-but-unverified, connected capture, unauthorized, forbidden, rate-limited, timed-out, and disconnected conditions. Keys never enter the UI, browser storage, logs, captures, or prompts. No real key was used during development; dependency-injected fixtures verify transport behavior.

```sh
OPENAI_ADMIN_KEY=… npm run collect:admin -- --check-config
OPENAI_ADMIN_KEY=… npm run collect:admin -- --live --start-time 1791763200 --output admin-capture.json
```

The resulting capture is an audit-oriented aggregate export; the dashboard does not merge it into its per-request ledger. Per-request attribution continues to require usage fields and application-owned IDs captured by the calling client. Organization aggregates, Codex subscription quota snapshots, local rate-card estimates, and actual invoices remain separate datasets.

Official references: [Admin APIs](https://developers.openai.com/api/docs/guides/admin-apis), [Completions usage](https://developers.openai.com/api/reference/resources/admin/subresources/organization/subresources/usage/methods/completions), [Costs](https://developers.openai.com/api/reference/resources/admin/subresources/organization/subresources/usage/methods/costs).
