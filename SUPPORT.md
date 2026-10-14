# Support and troubleshooting

- `Invalid ledger`: inspect the listed field paths; use `null` for unavailable counts.
- `cumulative snapshots are unsupported`: transform upstream snapshots into trusted per-request deltas, or use the full application's Codex event adapter, which keeps the latest cumulative snapshot per thread and never sums snapshots as requests.
- `unknown price`: add the exact model and a rate effective on or before the request date.
- Blank browser: use Node 20+, run `npm start`, and open the exact loopback URL shown.
- Clipboard unavailable: select the preview text manually.
- Need actual billing: use the provider's authorized billing/usage surfaces; AI Usage Lens estimates are not invoices.

When filing an issue, include version, Node/browser version, a synthetic reproducer, expected result, and actual result. Redact secrets and real prompts.
