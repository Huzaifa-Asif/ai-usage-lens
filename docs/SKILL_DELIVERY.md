# Private skill delivery

AI Usage Lens generates editable, instruction-only `SKILL.md` drafts from aggregate evidence. Local delivery is available through an explicit one-shot CLI. Company submission is **not available**: Promptalio remains only the proposed versioned source of truth until it exposes a reviewed cross-application write contract.

## Current implementation

- The browser can generate Codex, Claude Code and Cursor drafts and show a consent preview for selected clients.
- The preview labels the proposed personal discovery root, known effective consumers and the honest initial status: **not applied**.
- `src/delivery-plans.js` creates immutable, expiring copy plans, hashes the content and plan, deduplicates overlapping physical roots, requires acknowledgement when an unselected client can discover a selected root, and binds every update/remove to the reviewed current item, version and content digest.
- `src/local-skill-adapter.js` is the permissioned filesystem adapter. It discovers only explicitly supplied candidate roots inside a caller-supplied allowed base, including multiple Cursor personal/project folders. It rejects path and symlink escapes, refuses unmanaged or edited collisions, writes atomically, records ownership and operation receipts, supports idempotent retry, and provides guarded rollback.
- `src/skill-delivery-cli.js` makes the safe adapter reachable without a background service. It supports discovery, dry-run metadata diffs, exact plan confirmation, disclosure acknowledgement, apply, byte verification and receipt-bound rollback.
- `src/company-submission.js` is a contract-test model only. It is not imported by the browser, server or CLI and does not call Promptalio.

The automated adapter and CLI tests use disposable synthetic home folders only. They have not discovered or written the owner's real Codex, Claude or Cursor folders, changed settings, created grants, enabled sync, installed a plugin, connected Promptalio, or invoked any client.

## One-shot CLI flow

Create a local JSON configuration containing an explicit `allowedBase`, a journal directory inside it, the draft file, and only the roots you intend to inspect. Supported roots are `.agents/skills` for Codex, `.claude/skills` for Claude Code, and `.cursor/skills` for Cursor. The CLI never scans a home directory for candidates.

```json
{
  "allowedBase": "/explicit/owner-approved/base",
  "journalDir": "/explicit/owner-approved/base/.ai-usage-lens-journal",
  "item": { "id": "personal-item-id", "slug": "context-hygiene" },
  "version": { "id": "version-id", "contentFile": "/explicit/owner-approved/base/context-hygiene/SKILL.md" },
  "targets": [
    { "id": "codex-personal", "client": "codex", "root": "/explicit/owner-approved/base/.agents/skills", "scope": "personal" }
  ]
}
```

Run each phase separately:

```bash
npm run skills:deliver -- discover --config delivery.json
npm run skills:deliver -- preview --config delivery.json --out reviewed-plan.json
npm run skills:deliver -- apply --config delivery.json --plan reviewed-plan.json --out receipt.json --actor owner --operation install-001 --confirm-plan PLAN_DIGEST --ack DISCLOSURE_KEY
npm run skills:deliver -- verify --config delivery.json --receipt receipt.json
npm run skills:deliver -- rollback --config delivery.json --receipt receipt.json --actor owner --confirm-operation install-001 --confirm-plan PLAN_DIGEST --confirm-receipt RECEIPT_DIGEST
```

`preview` prints target paths, actions, byte counts, before/after digests, collisions, effective consumers and acknowledgement keys without printing skill contents. It writes the immutable content-bearing plan owner-only (`0600`) for local review. `apply` refuses an incorrect digest, missing disclosure acknowledgement, expired/tampered plan, unsupported root, changed before-state or unmanaged collision, and returns the authoritative receipt digest. Verification and rollback compare the supplied receipt to the owner-only journal copy; rollback requires the exact operation, plan and receipt digests. The CLI creates no daemon, login, credential, settings entry or update policy.

## Discovery boundaries

| Intended target | Proposed personal root | Known effective consumers | Verification after a real approved apply |
| --- | --- | --- | --- |
| Codex | `.agents/skills` | Codex and potentially Cursor | File digest, format validation, then Codex `/skills` or a harmless fresh-session discovery check |
| Claude Code | `.claude/skills` | Claude Code and potentially Cursor | File digest, format validation, then Claude discovery or `/reload-skills` when needed |
| Cursor | `.cursor/skills` | Cursor | File digest, format validation, then Customize → Skills or a fresh session |

Cursor can discover compatible roots from other clients. A plan must disclose this before consent and must not write duplicate copies into overlapping roots. Claude's reserved account-synced folder is never a local installation target. Cursor Cloud Agents sync and vendor account sync are separate channels; local file presence is not proof of cloud availability.

## Real apply requirements

Before any owner-device apply, the companion must discover exact profiles and roots locally, disclose every effective consumer, show exact file diffs and collisions, bind explicit consent to the immutable plan digest, receive a narrowly scoped root grant, and recheck expiry and before-digests immediately before writing. Rollback requires a separate approval bound to the exact operation receipt. Real installation remains blocked until the user approves that exact plan. Enabling ongoing updates needs a separate item/target/version policy and expiry.

## Company submission unavailable

Promptalio's current team BFF exposes same-origin, cookie-session and CSRF-protected actions such as `createPlaybook`, `addVersion` and `setReview`. Those are browser application internals, not a documented cross-application submission API, and its MCP surface is read-only and activation-gated. AI Usage Lens therefore does not call them or claim a working company library.

A real integration still needs a Promptalio-owned contract for: authenticated cross-application submission; tenant and active-membership selection; immutable multi-file/version payloads and digest verification; audience mapping; idempotency; reviewer assignment and separation of duties; bounded error semantics; and returned playbook/version/review identifiers. It also needs an approved OAuth/client or secure same-origin handoff. No compatible endpoint or credential-free server interface exists in the reviewed Promptalio source, so no offline network adapter was fabricated.
