# Store submission readiness

Checked against official documentation on 2026-10-14. This file records distribution routes and gates; it is not evidence of submission, approval, or publication.

## Release shape and data handling

The store candidate is the credential-free, skills-only package produced by `npm run build:plugin` and copied into the client-specific packages by `npm run build:clients`. It contains an offline CLI, one analysis skill, examples, schemas, MIT license, privacy, security, support and usage documentation, and icons. It contains no MCP server, hook, collector, credential, account data, telemetry, transcript reader, background service, or dependency install.

The skill reads only ledger and dated-price files the user deliberately supplies. Processing is local. It does not transmit the selected files, retain them, or create an account connection. Unknown usage and prices remain explicit. API-equivalent estimates are not invoices and are never combined with subscription utilization or quota windows. The separately hosted dashboard and native companion are not delivered by this store package.

## Milestone matrix

| Destination | Eligible package/route | Prepared | Submitted | Approved | Published | Remaining gate |
| --- | --- | --- | --- | --- | --- | --- |
| OpenAI Agent Plugins | Upload the skills-only ZIP through the platform plugin submission portal | Yes | No | No | No | The verified destination is the `Tech Team` organization / `Ai-Project`. The portal blocks creation/upload with **Complete identity verification**; complete that identity flow before the package can be transmitted |
| Anthropic directory | Public GitHub repository containing one Claude plugin, connected in `claude.ai/directory/manage` | Partial | No | No | No | The personal Claude session is signed out. Google sign-in opens a new consent grant for `openid profile email` with offline access; complete that grant, confirm an eligible plan/role, then connect GitHub and accept the directory terms/compliance acknowledgments |
| Claude self-hosted marketplace | Git repository with `.claude-plugin/marketplace.json` pointing to the plugin | Partial | No | No | No | Choose an exact repository/branch and decide whether to publish a generated distribution without duplicating maintained source |
| Cursor public Marketplace | Public Git repository submitted at `cursor.com/marketplace/publish` | Partial | No | No | No | The publisher application requires sign-in. GitHub login presents a new **Authorize Cursor** grant for read-only email-address access to the `Huzaifa-Asif` account; authorize it before the application fields can be inspected |

“Prepared” means local package artifacts and required policy/support files exist. “Partial” means the local client package validates, but the public repository shape or destination selection is not yet complete. A ZIP/folder shared directly with a user is local delivery, not store publication.

## OpenAI

Official documentation permits a skills-only Agent Plugin ZIP and describes upload, automated checks, review, and publisher-controlled publication as separate steps. The current root manifest supplies display name, short and long descriptions, developer name, category, capabilities, website, support and privacy links, icons, and starter prompts. The upload artifact is `artifacts/ai-usage-lens-openai-v0.3.0.zip`, built from `dist-plugin/` so the manifest remains at the archive root. The verified local file is 25,216 bytes with SHA-256 `0ab747e7d8ea12f18c2ca3defade7a8c57e562df8c292e881fa5aab90d283613`.

The package deliberately declares no MCP server or authentication flow. The native signed-in Codex collector is not inside the ZIP and is not represented as OAuth. Adding a remote MCP service later would be an architecture change requiring a new security/privacy review; no such service is proposed here.

References: [package plugins](https://developers.openai.com/plugins/build/plugins), [submit a plugin](https://developers.openai.com/plugins/deploy/submission), and [Claude Code plugin conversion](https://developers.openai.com/plugins/guides/submit-claude-plugin).

### Live portal check

The authorized personal browser reached `https://platform.openai.com/plugins` in the `Tech Team` organization with project `Ai-Project`. The Plugins page and upload control were visible. Selecting **Upload new or existing plugin** did not open a file chooser; it opened a modal stating **Complete identity verification** and **You need a verified developer identity before you can create or upload a plugin.** The flow stopped there. No file was selected or transmitted, and **Continue** was not selected. The exact human action is to complete the platform's developer identity verification for this organization, after reviewing whatever identity information that next screen requests.

## Anthropic

The generated Claude package at `dist-clients/claude/ai-usage-lens` includes `.claude-plugin/plugin.json` and passes `claude plugin validate --strict`. It also contains a README, LICENSE, privacy, security and support files. The current source repository does not commit that generated directory, so it is not yet a directory-ready public repository shape. Committing another maintained copy of the package would create avoidable source duplication; the release owner should instead choose a generated publication branch/repository or approve a root-manifest layout before submission.

Anthropic's directory submission requires a GitHub repository, account connection with push-access verification, an eligible paid plan/role, data-handling answers, compliance contact, acknowledgments and review. Accepting terms and connecting the account are user-only approval steps and were not performed.

The live personal browser was signed out. Choosing Google sign-in opened Google's OAuth account chooser with `prompt=consent`, `access_type=offline`, and scopes `openid profile email` for `claude.ai`. Because that would create or refresh an identity grant, the flow stopped before an account was selected. After sign-in, the directory additionally requires agreement to the [Anthropic Software Directory Terms](https://support.claude.com/en/articles/13145338-anthropic-software-directory-terms) and [Software Directory Policy](https://support.claude.com/en/articles/13145358-anthropic-software-directory-policy), plus four compliance acknowledgments. None were accepted.

References: [distribute plugins](https://code.claude.com/docs/en/plugins/publish), [submit to the directory](https://claude.com/docs/plugins/submit), and [pre-submission checklist](https://claude.com/docs/plugins/pre-submission-checklist).

## Cursor

The generated Cursor package at `dist-clients/cursor/ai-usage-lens` uses the supported root Agent Plugin manifest and contains its README, icon and skill. Cursor's public Marketplace route requires an open-source public Git repository and manual review via the publisher form. The local package has not been installed persistently or submitted; selecting the public repository/package path and sending the form remain approval-gated actions. Cursor's Teams/Enterprise private marketplace is a paid-plan route and is not proposed.

The live publisher page showed **Sign in to apply** and **You need to be signed in to submit a plugin publisher application.** Continuing with GitHub reached GitHub's **Authorize Cursor** screen for `Huzaifa-Asif`, requesting read-only access to email addresses and redirecting to `https://authenticate.cursor.sh`. The flow stopped before **Authorize cursor** was selected, so the grant was not created and the publisher-application fields remain uninspected.

References: [Cursor plugins](https://cursor.com/docs/plugins), [plugin reference](https://cursor.com/docs/reference/plugins), and [Marketplace publisher](https://cursor.com/marketplace/publish).

## Hosting status and constraint

The public static dashboard is separate from all store milestones. The production alias returned HTTP 200 and served 0.3.0 on 2026-10-14; the last directly confirmed production deployment remains recorded in the release report. No duplicate deployment was created during this readiness pass. Vercel documents Hobby as free but restricted to non-commercial personal use, with included usage pausing when limits are exceeded. That is compatible only while this remains a personal, non-commercial deployment; a commercial release would require a separately approved hosting decision.

Reference: [Vercel Hobby plan](https://vercel.com/docs/plans/hobby).

## Public source reconciliation

The configured local `origin` is a historical read-only bundle at `.../ai-usage-lens-source-v0.2.1.bundle`; it is not the public GitHub remote and must not be used to describe publication drift. Read-only `git ls-remote` and GitHub API checks confirmed `Huzaifa-Asif/ai-usage-lens:main` at `458e32d55d555cf7d60db29050032be4488b6e8b` (`docs: clarify production deployment evidence`). That commit is an ancestor of this workspace. The local store-readiness documentation is one commit ahead of the verified public branch and has not been pushed.

## Remaining human actions

The requested order is OpenAI first, then Anthropic, then Cursor. Destination preference is settled. Before each flow can continue:

1. OpenAI: complete developer identity verification for `Tech Team` / `Ai-Project`. Package upload and submission cannot begin before that identity exists.
2. Anthropic: complete the Google/Claude identity grant, then review the exact account plan/role, GitHub connection, directory terms, policy and compliance acknowledgments presented by the portal.
3. Cursor: authorize the observed Cursor GitHub OAuth grant, then inspect the publisher-application fields and any marketplace-specific agreement before entering repository details.
4. Confirm the final public support, privacy, website and repository URLs and compliance contact wherever the selected portal requests them.
5. For Anthropic and Cursor, establish a nonduplicative public repository, tracked branch and plugin path before source publication or submission.

No credentials should be pasted into chat, committed, or included in an artifact. No paid plan, grant, app registration, persistent installation or submission was created by this readiness work.
