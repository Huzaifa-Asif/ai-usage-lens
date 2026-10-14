# OpenAI plugin architecture and submission status — 2026-10-14

Version 0.3.0 produces a portable skills-only package with `npm run build:plugin` following the official [packaging guide](https://developers.openai.com/plugins/build/plugins). Its offline CLI and skill are tested, and the same package is used for the client-specific builds. A separately consented live check verified the full source application's read-only Codex account integration; that collector is intentionally excluded from the store package. Local packaging or client delivery is not directory submission, approval, or publication.

The official [submission guide](https://developers.openai.com/plugins/deploy/submission) accepts a skills-only ZIP through the platform plugin submission portal. Uploading requires an organization owner or Apps Management Write role and a verified developer identity, followed by automated checks, attestations and review. Approval and publisher-controlled publication remain later milestones. The current manifest includes skills-only listing metadata, privacy and support links, and required icon assets. `artifacts/ai-usage-lens-openai-v0.3.0.zip` is the local upload candidate; it has not been uploaded.

AI Usage Lens provides a standalone static dashboard, an explicit native loopback companion, and an offline ledger-analysis skill. The store package has no remote MCP endpoint, hook, account collector, authentication declaration, telemetry or background service. The native companion reuses only an already authenticated local Codex session for two user-invoked documented reads; it is not a general OAuth integration and is not accessible from the hosted static site.

If a remote MCP service is proposed later, it will require a new architecture, authentication, privacy and security review. MCP reviewer-account setup, domain verification and MCP-specific positive/negative test evidence do not apply to the current skills-only candidate and are not claimed.

See [store submission readiness](STORE_SUBMISSION.md) for the OpenAI, Anthropic and Cursor route matrix, exact gates, and hosting constraint.
