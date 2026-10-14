# Store submission readiness

Checked against official documentation on 2026-10-14. This file records distribution routes and gates; it is not evidence of submission, approval, or publication.

## Release shape and data handling

The store candidate is the credential-free, skills-only package produced by `npm run build:plugin` and copied into the client-specific packages by `npm run build:clients`. It contains an offline CLI, one analysis skill, examples, schemas, MIT license, privacy, security, support and usage documentation, and icons. It contains no MCP server, hook, collector, credential, account data, telemetry, transcript reader, background service, or dependency install.

The skill reads only ledger and dated-price files the user deliberately supplies. Processing is local. It does not transmit the selected files, retain them, or create an account connection. Unknown usage and prices remain explicit. API-equivalent estimates are not invoices and are never combined with subscription utilization or quota windows. The separately hosted dashboard and native companion are not delivered by this store package.

## Milestone matrix

| Destination | Eligible package/route | Prepared | Submitted | Approved | Published | Remaining gate |
| --- | --- | --- | --- | --- | --- | --- |
| OpenAI Agent Plugins | Upload the skills-only ZIP through the platform plugin submission portal | Yes | No | No | No | Confirm the exact destination account/organization, owner or Apps Management Write access, verified developer identity, listing metadata, required attestations, and explicit approval for the portal upload |
| Anthropic directory | Public GitHub repository containing one Claude plugin, connected in `claude.ai/directory/manage` | Partial | No | No | No | Choose the public repository and nonduplicative plugin path/branch; connect GitHub with push verification; confirm an eligible paid Claude plan and authorized submitter; accept directory terms and data-handling acknowledgments |
| Claude self-hosted marketplace | Git repository with `.claude-plugin/marketplace.json` pointing to the plugin | Partial | No | No | No | Choose an exact repository/branch and decide whether to publish a generated distribution without duplicating maintained source |
| Cursor public Marketplace | Public Git repository submitted at `cursor.com/marketplace/publish` | Partial | No | No | No | Choose the exact public repository/package layout, confirm the final logo and metadata, and explicitly authorize form submission for manual review |

“Prepared” means local package artifacts and required policy/support files exist. “Partial” means the local client package validates, but the public repository shape or destination selection is not yet complete. A ZIP/folder shared directly with a user is local delivery, not store publication.

## OpenAI

Official documentation permits a skills-only Agent Plugin ZIP and describes upload, automated checks, review, and publisher-controlled publication as separate steps. The current root manifest supplies display name, short and long descriptions, developer name, category, capabilities, website, support and privacy links, icons, and starter prompts. The upload artifact is `artifacts/ai-usage-lens-openai-v0.3.0.zip`, built from `dist-plugin/` so the manifest remains at the archive root. The verified local file is 25,216 bytes with SHA-256 `0ab747e7d8ea12f18c2ca3defade7a8c57e562df8c292e881fa5aab90d283613`.

The package deliberately declares no MCP server or authentication flow. The native signed-in Codex collector is not inside the ZIP and is not represented as OAuth. Adding a remote MCP service later would be an architecture change requiring a new security/privacy review; no such service is proposed here.

References: [package plugins](https://developers.openai.com/plugins/build/plugins), [submit a plugin](https://developers.openai.com/plugins/deploy/submission), and [Claude Code plugin conversion](https://developers.openai.com/plugins/guides/submit-claude-plugin).

## Anthropic

The generated Claude package at `dist-clients/claude/ai-usage-lens` includes `.claude-plugin/plugin.json` and passes `claude plugin validate --strict`. It also contains a README, LICENSE, privacy, security and support files. The current source repository does not commit that generated directory, so it is not yet a directory-ready public repository shape. Committing another maintained copy of the package would create avoidable source duplication; the release owner should instead choose a generated publication branch/repository or approve a root-manifest layout before submission.

Anthropic's directory submission requires a GitHub repository, account connection with push-access verification, an eligible paid plan/role, data-handling answers, compliance contact, acknowledgments and review. Accepting terms and connecting the account are user-only approval steps and were not performed.

References: [distribute plugins](https://code.claude.com/docs/en/plugins/publish), [submit to the directory](https://claude.com/docs/plugins/submit), and [pre-submission checklist](https://claude.com/docs/plugins/pre-submission-checklist).

## Cursor

The generated Cursor package at `dist-clients/cursor/ai-usage-lens` uses the supported root Agent Plugin manifest and contains its README, icon and skill. Cursor's public Marketplace route requires an open-source public Git repository and manual review via the publisher form. The local package has not been installed persistently or submitted; selecting the public repository/package path and sending the form remain approval-gated actions. Cursor's Teams/Enterprise private marketplace is a paid-plan route and is not proposed.

References: [Cursor plugins](https://cursor.com/docs/plugins), [plugin reference](https://cursor.com/docs/reference/plugins), and [Marketplace publisher](https://cursor.com/marketplace/publish).

## Hosting status and constraint

The public static dashboard is separate from all store milestones. The production alias returned HTTP 200 and served 0.3.0 on 2026-10-14; the last directly confirmed production deployment remains recorded in the release report. No duplicate deployment was created during this readiness pass. Vercel documents Hobby as free but restricted to non-commercial personal use, with included usage pausing when limits are exceeded. That is compatible only while this remains a personal, non-commercial deployment; a commercial release would require a separately approved hosting decision.

Reference: [Vercel Hobby plan](https://vercel.com/docs/plans/hobby).

## Approval bundle for a future submission

Before any submission, the release owner must provide or confirm:

1. The exact destination (OpenAI organization, Anthropic directory account/repository, or Cursor Marketplace repository).
2. Permission to connect the required developer identity/GitHub account and accept the destination's current terms and attestations.
3. The final public support, privacy, website and repository URLs and compliance contact where requested.
4. For Anthropic and Cursor, the nonduplicative public repository/branch/package path to submit.
5. Explicit approval for the final portal/form submission after the generated candidate and entered metadata are reviewed.

No credentials should be pasted into chat, committed, or included in an artifact. No paid plan, grant, app registration, persistent installation or submission was created by this readiness work.
