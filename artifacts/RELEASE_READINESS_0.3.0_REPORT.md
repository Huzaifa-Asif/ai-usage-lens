# AI Usage Lens 0.3.0 release-readiness report

Date: 2026-10-14

## Outcome

The local 0.3.0 candidate adds the Promptalio-inspired graphite/silver visual system, responsive light and dark themes, conversation/message drill-down, timezone-aware daily/weekly/monthly token and cost views, explicit Codex and Cursor one-shot connections, and editable evidence-backed Codex/Cursor `SKILL.md` exports.

No source publication, hosted deployment, credential creation, persistent grant, account login, live account read, or settings change was performed.

## Data and security boundaries

- API cost evidence remains separate from subscription utilization and quota windows.
- Provider-reported cost and dated-rate estimates are labeled separately; unknown cost is not zero-filled.
- Cursor credentials remain server-side. Member names, email addresses, user IDs, and roles are discarded; daily rows are aggregated before reaching the browser. Spend pagination is bounded and all documented pages are reduced to separate on-demand and overall cents totals.
- Codex collection remains an explicit one-shot read through an already authenticated local App Server session. No general OAuth flow is claimed.
- Skill drafts accept only fixed templates with validated aggregate evidence. Private text, conversation/message identifiers, source/account labels, identity data, and credentials are excluded. Export is download-only and never installs or configures a client.

## Verification

- `npm run check`: 96 passed, 0 failed, 1 skipped. The skipped synthetic HTTP socket test reports sandbox `EPERM`; equivalent handler, cancellation, and retry behavior is covered without a socket.
- `npm run build:static`: passed. Output contains no server, collectors, credentials, or account data.
- `npm run build:plugin`: passed. Output contains no server, collectors, hooks, credentials, or account data.
- `git diff --check`: passed.
- Browser QA on the local companion: light/dark desktop, 390 × 844 mobile, reduced motion, daily/weekly/monthly periods, provider filtering, token/cost chart series, message drill-down, connection error states, editable skill draft, and download initiation. No console warnings/errors and no horizontal mobile overflow.
- Independent review identified Cursor response overcollection and spend-shape/pagination errors, import-order and scoped-ID context accumulation problems, missing visual cost series/filter coupling, missing bridge coverage, absent live announcements, an infinite-ratio skill edge case, and filesystem-boundary issues in the delivery adapter. All were addressed and retested. The final verdict was **GO for the credential-free delivery implementation**, with no remaining material correctness, privacy, security, accessibility, or regression blocker.

## Source and deployment status

The 0.2.2 unpublished checkpoint was reconstructed exactly from preserved artifacts before work began and saved locally as commit `d9870c042a52d6b6cbbe85f3ef72cf46ca79f702`. The release ledger verifies public source `main` at 0.2.1; the hosted version was not inspected and remains separately unverified. The historical automatic approval rejection applied to the maintenance push, which later succeeded only after explicit publication authorization. No 0.3.0 publication was attempted. This checkout's `origin` is a local handoff bundle rather than the GitHub write remote, so a new source push needs explicit approval for the exact repository/branch and external write. Deploying `dist-hosted/` separately needs a named site/project and explicit approval.

The current candidate also includes credential-free Codex, Claude Code and Cursor delivery plans, effective-consumer disclosure, exact-plan approval, an allowlisted local adapter with idempotency/collision protection/rollback, and frozen company-submission review boundaries. Tests exercise disposable synthetic client directories only. No real client root, persistent grant, Promptalio tenant, hosted database, reviewer assignment, sharing state or vendor sync was changed.

Promptalio remained read-only at branch `handoff/promptalio-visual-refresh`, commit `e63e15fb84556e6e3ede0cc341fbe887dedb47ec`.
