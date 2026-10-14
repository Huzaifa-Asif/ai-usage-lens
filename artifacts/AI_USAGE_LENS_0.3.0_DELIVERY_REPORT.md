# AI Usage Lens 0.3.0 delivery

- Source commit: `ce7dd67632bf391e13e54f6d80f058180ecf13a4`
- Source archive: `ai-usage-lens-source-v0.3.0.tgz`
- Source archive SHA-256: `328f5527b91c71540d6366d0c87f042059f59d93e46e3e2a2a97136ca25bbba9`
- Source archive size: 92,320 bytes
- Automated verification: 96 passed, 0 failed, 1 sandbox loopback skip
- Builds: static hosted and skills-only plugin passed
- Browser QA: dark/light desktop, 390 × 844 mobile, reduced motion, daily/weekly/monthly charts, filters, message drill-down, connection states, editable skill draft, and export initiation; no console warnings/errors
- Independent verdict: GO for the credential-free delivery implementation; no remaining material correctness or security blocker

Publication status: no 0.3.0 push or deployment was attempted. The preserved release ledger verifies public source `main` at 0.2.1. The hosted version was not inspected in this pass and is therefore separately unverified; it must not be inferred from the source branch. The earlier automatic approval review rejected a maintenance push, which was later retried once only after explicit publication authorization and then succeeded for 0.2.1. That historical success does not authorize a 0.3.0 push or deployment.

Current source-publication blocker: this checkout's `origin` is a local read-only handoff bundle path, not the GitHub write remote. Publishing 0.3.0 would require an explicitly approved external write to the named GitHub repository and branch after exact-commit review. Hosted deployment would require a separately named site/project and explicit approval. Neither action was attempted.

Skill delivery milestone: credential-free plan creation, effective-consumer disclosure, exact-plan approval, bounded filesystem application, idempotent retry, collision protection, receipts and rollback are implemented and tested only in disposable synthetic client directories. No owner profile was scanned or modified. Company submission is modeled as a frozen fork with membership, reviewer and self-review boundaries; no Promptalio database or sharing state was changed.

Incremental browser QA: Claude Code draft selection and the local delivery preview were verified in light mobile (390 × 844) and dark desktop views. Codex/Claude selections disclosed Cursor as an effective consumer, every target remained explicitly `Not applied`, the mobile page had no horizontal overflow, and the browser console had no warnings or errors.

Live provider status: no real Codex or Cursor account read was performed. Credential creation, grants, and account access remain explicit user actions.
