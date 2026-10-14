# Privacy

The skills-only plugin edition contains only an offline CLI and manual-analysis skill. It does not include the browser, companion, collectors, hooks, or authentication. The CLI reads explicitly selected files without network or persistent output; the host may retain conversation/tool results under its own policies. The companion-specific statements below apply only to the separate full application.

The browser/static edition processes imported JSON in memory, sends no telemetry, and stores no ledger or pricing data. Same-origin requests load static files and demo data. The local companion may make explicitly requested provider reads; credentials remain in its native process. Selected optimization IDs are stored in browser local storage only after the user checks a suggestion; **Reset local choices** removes them. Closing/reloading clears imported data.

Avoid importing secrets or regulated data. IDs and labels appear on screen. The included Codex adapter accepts captured usage events, not transcripts. By default no account connection occurs. The optional explicit `--live` collector starts an already authenticated local Codex App Server, reads account usage and rate-limit summaries, writes one local JSON file with mode `0600`, and then exits; it does not read transcripts, log in, store credentials, or send data to AI Usage Lens.

The optional Admin reporting CLI reads `OPENAI_ADMIN_KEY` only from its process environment and sends it to two fixed official organization reporting endpoints. The key is never written to its aggregate capture, logs, browser storage, or UI. The owner-only capture can still contain sensitive organization usage and cost aggregates; review it before sharing.
