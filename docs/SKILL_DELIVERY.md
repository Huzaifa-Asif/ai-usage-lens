# Private skill delivery and company submission

AI Usage Lens generates editable, instruction-only `SKILL.md` drafts from aggregate evidence. Promptalio remains the proposed versioned source of truth for private items and company review. Saving, installing, enabling updates, submitting for review, approving and publishing are separate actions.

## Current implementation

- The browser can generate Codex, Claude Code and Cursor drafts and show a consent preview for selected clients.
- The preview labels the proposed personal discovery root, known effective consumers and the honest initial status: **not applied**.
- `src/delivery-plans.js` creates immutable, expiring copy plans, hashes the content and plan, deduplicates overlapping physical roots, requires acknowledgement when an unselected client can discover a selected root, and binds every update/remove to the reviewed current item, version and content digest.
- `src/local-skill-adapter.js` is the permissioned filesystem adapter. It discovers only explicitly supplied candidate roots inside a caller-supplied allowed base, including multiple Cursor personal/project folders. It rejects path and symlink escapes, refuses unmanaged or edited collisions, writes atomically, records ownership and operation receipts, supports idempotent retry, and provides guarded rollback.
- `src/company-submission.js` creates a frozen company-review fork containing the selected immutable file bytes and verified digests from a private personal item. Active membership, contributor permission, reviewer permission and optional separation of duties are enforced independently. Approval remains `approved_not_published`.

The automated adapter tests use disposable synthetic home folders only. The adapter has not discovered or written the owner's real Codex, Claude or Cursor folders, changed settings, created grants, enabled sync, installed a plugin, connected Promptalio, or invoked any client.

## Discovery boundaries

| Intended target | Proposed personal root | Known effective consumers | Verification after a real approved apply |
| --- | --- | --- | --- |
| Codex | `.agents/skills` | Codex and potentially Cursor | File digest, format validation, then Codex `/skills` or a harmless fresh-session discovery check |
| Claude Code | `.claude/skills` | Claude Code and potentially Cursor | File digest, format validation, then Claude discovery or `/reload-skills` when needed |
| Cursor | `.cursor/skills` | Cursor | File digest, format validation, then Customize → Skills or a fresh session |

Cursor can discover compatible roots from other clients. A plan must disclose this before consent and must not write duplicate copies into overlapping roots. Claude's reserved account-synced folder is never a local installation target. Cursor Cloud Agents sync and vendor account sync are separate channels; local file presence is not proof of cloud availability.

## Real apply requirements

Before any owner-device apply, the companion must discover exact profiles and roots locally, disclose every effective consumer, show exact file diffs and collisions, bind explicit consent to the immutable plan digest, receive a narrowly scoped root grant, and recheck expiry and before-digests immediately before writing. Rollback requires a separate approval bound to the exact operation receipt. Real installation remains blocked until the user approves that exact plan. Enabling ongoing updates needs a separate item/target/version policy and expiry.

## Company boundary

A company submission contains only the selected immutable files and their digest. It excludes source chats, local paths, usage history and unselected items. Active membership is required to submit or review. A contributor cannot publish by submitting; an authorized reviewer decision produces an approved but unpublished snapshot. Promptalio's real tenant database, invitations, reviewers, audience grants and publication state are not changed by this local model.
