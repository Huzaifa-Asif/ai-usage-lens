# AI Usage Lens 0.2.2 — local release readiness

## Outcome

The full offline dashboard retains thread/request detail, cache/reasoning-aware measured usage, separately dated currency estimates, integrity gaps and manual optimization previews. A new portable skills-only plugin packages the offline CLI/core, canonical skill, original SVG icon, synthetic examples, schemas and governance documents. It has no server, collectors, hooks or authentication.

Official OpenAI package/submission documentation and the portable manifest schema were checked. Supported package shape does not mean native installation, submission or approval. No unseen transcripts, historical message billing, global prompt rewrite or host-setting control is claimed. Optimization is manual and preserves constraints.

## Verification

- `npm run check`: syntax passed; 74 tests, 73 passed, 0 failed, 1 skipped. The socket-based HTTP integration is skipped because local listening returns EPERM. No optional approval was requested.
- `npm run build:static` and `npm run build:plugin`: passed.
- Clean ZIP extraction into a path with spaces and bundled CLI: passed; 1,200 tokens, USD 0.00288 estimate, 40% cache share, dated synthetic provenance.
- FIFO rejection, malformed UTF-8, oversized JSON, sanitized filesystem/JSON errors, extracted module declaration, 101-thread capped output with exact totals, omitted counts and rate provenance have regressions.
- Independent review identified and prompted fixes to FIFO blocking, extracted Node module metadata, excessive record output, missing rate provenance and invalid UTF-8 acceptance. The reviewer found no remaining runtime/skill blocker. Its final documentation-coherence finding was subsequently fixed with package-specific SUPPORT, SECURITY and IMPORT documents; the full suite was rerun successfully after that fix.
- Skill Creator's standard validator could not run because local Python lacks PyYAML; custom frontmatter/package checks passed. This is not a claim that the standard validator passed.

## Artifacts

- `ai-usage-lens-plugin-v0.2.2.zip`: SHA-256 `1f812c4e30e6940101210eb8d86f16f5b889c86349582f37a4f698c3b7f3b955`.
- `ai-usage-lens-hosted-v0.2.2.tgz`: SHA-256 `1a11c49f655fed4419db00b76a575273f89dfca461fa6522121074186dfda4dd`.
- The source archive is generated from the staged Git tree; exact hash is in the final handoff. No new Git bundle is claimed: the signing daemon was inaccessible (EPERM), so the configured signed commit could not be created. Signing settings were not changed; staged edits remain available.
- All v0.2.1 archives/reports and the immutable v0.2.0 release are preserved.

## Remaining limits and rollout

Native host installation/skill discovery, actual LLM skill selection, fresh/existing-chat behavior, browser accessibility/visual QA, live account reads and public-directory scans/review are not verified by these tests. Node 20/22/24 CI for this new local checkpoint has not been run here. No deployment, remote push, publication, directory submission, legal attestation, credential change or Library transfer was performed in this checkpoint. Existing live deployment/Library copies therefore do not yet contain v0.2.2.

The coordinator owns browser/deployment rollout. Use `docs/LOCAL_PLUGIN.md` for explicit user-run installation and undo; `docs/REVIEW_CASES.md` describes synthetic evaluation cases. Source publication, hosted deployment, native install and directory approval remain separate milestones. A trusted environment with the existing signing daemon is needed to create the local signed commit.

## Evidence

- https://developers.openai.com/plugins/build/plugins
- https://developers.openai.com/plugins/deploy/submission
- https://developers.openai.com/plugins/plugin-guidelines
- https://agent-plugins.org/schemas/1.0.0/plugin.schema.json
