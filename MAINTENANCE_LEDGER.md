# AI Usage Lens maintenance — October 13 MYT

## Reconciled baseline

- Canonical source: task-6, public repository https://github.com/Huzaifa-Asif/ai-usage-lens .
- Immutable v0.2.0 tag/release: `d8e3e5e63a125d73dd22edc99e020c80646fb985`, with locally/extracted-tested archives. It had no historical CI.
- Separate CI commit: `1c48603fce0d8e7572b10e1ee831e5be8f3cf51f`, verified remote main. [Run 38251248770](https://github.com/Huzaifa-Asif/ai-usage-lens/actions/runs/38251248770) succeeded across Node 20, 22, and 24.
- Hosted static dashboard https://ai-usage-lens.vercel.app/ returned HTTP 200 in a read-only check. This pass makes no deployment or browser claim.
- The shared task-7 release ledger contains an older invalid-CLI-access statement. This pass's own read-only CLI identity check succeeded as Huzaifa-Asif; it neither retried the different app's integration403 nor changed authentication.

## Substantive fix

Cancel previously changed the UI label without aborting its HTTP request/backend collector. Late results could refill cleared views. v0.2.1 adds browser AbortSignal handling, stale-response rejection, HTTP-disconnect propagation, and one in-flight collection per companion. Cancel controls are operation-owned. The read-only method/destination allowlists and hosted/native separation remain unchanged.

## Verification and limits

- Syntax checks for all source/UI/scripts/fixtures and JavaScript runtime tests: 72 total; sandbox run 71 passed, one socket integration skipped with EPERM.
- Separately permitted synthetic HTTP integration: 5/5 passed; no credentials or real account required.
- Final permitted full suite: 72/72 passed, zero skipped; static build passed.
- Independent manual scoped review: PASS, no material findings after cancel-ownership correction. Formal security-diff skill was unavailable because its linked preflight resource could not be read; no formal scan claim is made.
- Static build and package dry run pass. Default npm cache was unwritable; a task-specific `/tmp` cache succeeded without changing cache ownership or system permissions.
- Browser/live-account verification, paid calls, credential setup, directory submission, npm publication, and deployment: not run in this pass.
- Final exact-commit CI, source/archive hashes, and extracted package results are recorded in the handoff. v0.2.0 artifacts remain immutable; v0.2.1 artifacts are a separate prepared update.

## Queue

Automatic approval review initially rejected the maintenance push. The parent then supplied explicit user authorization for recurring personal-app publication and justified fixes. The same push was retried once under that evidence and succeeded. Remote main was verified as `cb84b316c0abf07e511d131d5084c460c25557c9`; [maintenance CI run 38289976128](https://github.com/Huzaifa-Asif/ai-usage-lens/actions/runs/38289976128) completed successfully on Node 20, 22, and 24. No denial was bypassed and no authentication or account settings were changed. The final documentation follow-up and matching artifacts are recorded in the release handoff.

Deploy/review v0.2.1 only through the active coordinator after exact-commit CI and asset checks. Further directory work requires an eligible package and human review information; it is not a prerequisite for using the local companion. No new app was started.
