# AI Usage Lens 0.3.0 release-readiness report

Date: 2026-10-14

## Outcome

The local 0.3.0 candidate adds the Promptalio-inspired graphite/silver visual system, responsive light and dark themes, conversation/message drill-down, timezone-aware daily/weekly/monthly token and cost views, explicit Codex and Cursor one-shot connections, and editable evidence-backed Codex/Cursor `SKILL.md` exports.

The reviewed source is published and the upgraded UI is live. No credential creation, persistent grant, account login or settings change was performed. One consented read-only Codex App Server capture was completed and its temporary local file was deleted.

## Data and security boundaries

- API cost evidence remains separate from subscription utilization and quota windows.
- Provider-reported cost and dated-rate estimates are labeled separately; unknown cost is not zero-filled.
- Cursor credentials remain server-side. Member names, email addresses, user IDs, and roles are discarded; daily rows are aggregated before reaching the browser. Spend pagination is bounded and all documented pages are reduced to separate on-demand and overall cents totals.
- Codex collection remains an explicit one-shot read through an already authenticated local App Server session. No general OAuth flow is claimed.
- Skill drafts accept only fixed templates with validated aggregate evidence. Private text, conversation/message identifiers, source/account labels, identity data, and credentials are excluded. Export is download-only and never installs or configures a client.

## Verification

- `npm run check`: 100 tests total; 99 passed, 0 failed, 1 skipped. The skipped synthetic HTTP socket test reports sandbox `EPERM`; equivalent handler, cancellation, and retry behavior is covered without a socket.
- `npm run build:static`: passed. Output contains no server, collectors, credentials, or account data.
- `npm run build:plugin`: passed. Output contains no server, collectors, hooks, credentials, or account data.
- `npm run build:clients`: passed. Codex, Claude and Cursor packages contain only the portable skill package, native manifests and exact checksum metadata. Claude strict manifest validation passed.
- `git diff --check`: passed.
- Browser QA on the local companion: light/dark desktop, 390 × 844 mobile, reduced motion, daily/weekly/monthly periods, provider filtering, token/cost chart series, message drill-down, connection error states, editable skill draft, and download initiation. No console warnings/errors and no horizontal mobile overflow.
- Independent review identified Cursor response overcollection and spend-shape/pagination errors, import-order and scoped-ID context accumulation problems, missing visual cost series/filter coupling, missing bridge coverage, absent live announcements, an infinite-ratio skill edge case, and filesystem-boundary issues in the delivery adapter. All were addressed and retested. The final verdict was **GO for the credential-free delivery implementation**, with no remaining material correctness, privacy, security, accessibility, or regression blocker.

## Source and deployment status

The 0.2.2 unpublished checkpoint was reconstructed exactly from preserved artifacts before work began and saved locally as commit `d9870c042a52d6b6cbbe85f3ef72cf46ca79f702`. Public source `main` is now exact commit `2b846b6f08da8a61d59063577b382b50473e3bd6`; GitHub Actions run `38610307794` passed on Node 20, 22 and 24. Production deployment `dpl_FY2DVt6fakqC9LtYt1Q1C6CnB1qg` is READY at `https://ai-usage-lens.vercel.app` from UI commit `f9c3a3fa6857616b8ca1fe6623954c6ef0ce87d8`. Commit `2b846b6` adds only native client packaging, so the existing production deployment was not duplicated.

The release also includes a reachable one-shot CLI for credential-free Codex, Claude Code and Cursor discovery, dry-run review, effective-consumer disclosure, exact-plan consent, apply, byte verification and receipt-bound rollback. Tests exercise disposable synthetic client directories only. Native packages are saved in Library as `libfile_801730eebed08191978f0101807fa46d` (SHA-256 `8dd8989e8c89f010628307dbb33ec90c574fd75aeb0c68fd5cd61fc7b2f24177`, 73,917 bytes). Company submission is unavailable: its local module is a contract-test model and has no Promptalio API, database or publication integration. No real client root, persistent grant, Promptalio tenant, hosted database, reviewer assignment, sharing state or vendor sync was changed.

Live account verification remained read-only and minimized. Codex App Server returned documented quota/activity structures through exactly `account/rateLimits/read` and `account/usage/read`; the temporary capture was deleted. Claude CLI 2.1.220 and Cursor 3.20.21 were present but their personal sessions were signed out, so no live usage read was possible without a secure user sign-in or, for Cursor team usage, an Admin API credential. No credential or authorization was scraped, created or persisted.

Promptalio remained read-only at branch `handoff/promptalio-visual-refresh`, commit `e63e15fb84556e6e3ede0cc341fbe887dedb47ec`.
