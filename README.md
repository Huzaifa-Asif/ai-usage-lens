# AI Usage Lens

Release architecture: [hosted static dashboard and local companion](docs/DEPLOYMENT.md). Build `dist-hosted/` with `npm run build:static`; deploy that folder only. Signed-in Codex reads run on the user's computer through the local companion.

AI Usage Lens is the finalized product name. Existing `token-lens/*` data schemas, `token-lens-selection` browser storage, `token_lens_local` client identity, `token-lens-local` private package name, and `skill/token-lens` path are retained for compatibility. Existing imports and saved choices continue to work.

AI Usage Lens is a local-first app for exploring token usage by conversation and model request, estimating API-equivalent cost from a dated user-supplied rate card, and producing transparent optimization guidance. It does **not** claim access to unseen ChatGPT/Codex/Cursor transcripts, actual provider billing where none is reported, or a global prompt-setting switch.

## Quick start

For the installable skills-only edition, run `npm run build:plugin` and follow [local plugin instructions](docs/LOCAL_PLUGIN.md). It contains the offline CLI and manual guidance skill, not account collectors or prompt-interception hooks. Native installation and public-directory approval are separate verification steps.

Requires Node.js 20+ and no third-party packages.

```sh
npm test
npm start
```

Open `http://127.0.0.1:4173`. Explicit same-origin actions can read Codex account usage from an existing local session and Cursor team aggregates when `CURSOR_API_KEY` is configured in the server environment. No browser credential is requested. CLI capture/import remains fallback, and no route is continuous synchronization. See [Cursor connection](docs/CURSOR_CONNECTION.md). For a terminal summary:

```sh
npm run cli -- examples/ledger.json examples/prices.json
```

An optional explicit read-only Codex App Server collector is documented in [docs/CODEX_COLLECTOR.md](docs/CODEX_COLLECTOR.md). It is never run automatically, performs no login or settings changes, and was tested only against a stub process—not a real account.

The separately authenticated OpenAI organization Admin API has a bounded environment-key CLI collector documented in [docs/ADMIN_API_CONNECTION.md](docs/ADMIN_API_CONNECTION.md). It collects only aggregate usage/cost buckets and cannot provide retrospective thread/message attribution.

Connection status: when launched with `npm start`, the same-origin loopback server exposes explicit POST-only collection actions with strict Host/Origin validation. Codex quota/activity data, Cursor team aggregates, and optional OpenAI organization aggregates return to separate views without a file handoff. CLI capture/import remains a fallback. No path provides background synchronization, automatic login, or persistent access.

## Useful now

- Thread overview and request/message drill-down.
- Provider-reported quota windows with remaining percentage and reset time; absent daily/weekly/monthly windows remain unavailable.
- Correct separation of uncached input, cached input, output, and output reasoning detail.
- Price selection by model and effective date; currencies are never converted or combined.
- Missing usage and unknown prices remain visible instead of becoming zero.
- Stable-ID deduplication; conflicting duplicates and cumulative snapshots fail closed.
- Rule-based, evidence-bearing suggestions with manual checklist, optional Codex hook-context previews, and editable Codex/Cursor `SKILL.md` exports.
- Browser-only processing and preferences. The local server serves static files and has no ingest endpoint.
- Tested adapters for saved Responses API objects and captured, authorized Codex App Server token events.

## Capability boundary

The OpenAI Responses API exposes request usage fields. Cached input is included within input, and reasoning is included within output, so AI Usage Lens subtracts cached input from ordinary input pricing and never adds reasoning again. Prompt caching is automatic on supported API models and benefits stable prefixes, but a cache hit is not guaranteed. See the official [Prompt caching guide](https://developers.openai.com/api/docs/guides/prompt-caching) and [API pricing](https://developers.openai.com/api/docs/pricing).

Codex App Server documents `thread/tokenUsage/updated` plus authenticated `account/usage/read` summaries. Account activity can be unavailable and is not message-level billing. The import adapter remains offline. Separately, the optional `--live` collector can spawn an already installed, already authenticated local App Server and make only two allowlisted account reads; it never logs in, stores credentials, or runs automatically. See the official [Codex App Server docs](https://learn.chatgpt.com/docs/app-server).

When authorized `account/usage/read` returns thread estimates, the adapter preserves provider-estimated credit micros and nullable USD micros separately with `provider_estimate_not_invoice` provenance. These values are never merged with rate-card API estimates or presented as an invoice.

Codex `UserPromptSubmit` hooks can add developer context or block a prompt; the documented output does not replace the user's prompt. AI Usage Lens only previews this JSON. It never installs a hook. See the official [Codex Hooks docs](https://learn.chatgpt.com/docs/hooks).

ChatGPT subscription activity is not converted into claimed API charges. Rate-card output is labeled an estimate, never an invoice. Organization usage/cost exports may be imported only after a caller explicitly transforms request-level data; aggregate buckets cannot truthfully be attributed back to messages.

## Data model

See [docs/IMPORT.md](docs/IMPORT.md), [schemas/ledger.schema.json](schemas/ledger.schema.json), [schemas/prices.schema.json](schemas/prices.schema.json), and [schemas/quotas.schema.json](schemas/quotas.schema.json). Input is a `token-lens/v1` envelope of per-request deltas. A visible chat message can involve retries, tools, or multiple model requests, so each record is one model request associated with application-owned thread/message IDs. Tool results are not automatically billable model responses.

## Optimization scope

Suggestions are deterministic rules over imported data. Selecting one creates a preview that the user can copy. The manual checklist is suitable for ChatGPT or Codex. The Codex JSON is only developer context for an intentionally configured trusted local hook. It is not a prompt rewrite or global setting. Reset removes the selection from browser local storage.

The Optimization studio can also generate an editable, downloadable `SKILL.md` for Codex or Cursor from supported aggregate signals. The generator uses fixed templates and validated numeric evidence; prompt text, conversation titles, message IDs, source labels, account identity, and credentials are never inserted. It does not install a skill, create folders, change settings, or guarantee savings. See [skill exports](docs/SKILL_EXPORTS.md).

## Development

Use Cancel while a local read is running to abort its browser request; the companion aborts the collector when that connection closes. Demo/import/disconnect supersede a pending read, and late responses are ignored. Only one collection runs at a time. `npm run integration` exercises this with synthetic HTTP transport; it skips explicitly if loopback listening is blocked by the execution environment. No test needs an account or key.

GitHub Actions checks syntax, all fixture-only tests, and the static build on Node 20, 22, and 24. It uses pinned official actions, read-only repository permissions, and no secrets or account calls. The immutable v0.2.0 release predates this workflow and was verified locally and from extracted artifacts; CI results apply to subsequent commits.

```sh
npm run check
```

The browser sends only same-origin requests. The static hosted build has no backend, credential access, or telemetry. The local companion can explicitly query supported Codex account endpoints and optional Admin aggregates using credentials kept outside the renderer. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md), [SECURITY.md](SECURITY.md), and [PRIVACY.md](PRIVACY.md).

## Status

This is an honest local MVP, not a provider billing product. Browser visual inspection may still vary by browser; core behavior and server delivery are covered by automated tests. MIT licensed.
