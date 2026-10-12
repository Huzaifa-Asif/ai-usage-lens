# Plugin architecture and submission status — October 13 MYT

Current official [plugin architecture](https://developers.openai.com/plugins/concepts/plugins) supports skills, MCP tools, optional MCP UI, and surface-specific hooks. Installing a web plugin does not deploy native hook scripts. AI Usage Lens currently provides a standalone static dashboard, native loopback companion, and local ledger-analysis skill; it has no remote MCP endpoint or submitted directory package.

The [submission guide](https://developers.openai.com/plugins/deploy/submission#authentication-limitations) supports no-auth, OAuth, or mixed no-auth/OAuth portal connections. API-key, Basic, and custom-header declarations do not provide a portal key input flow. Nonempty server headers are rejected for public submission, and a protected service must not be described as unauthenticated. Authentication secrets must stay out of public packages and chat/tool inputs.

MCP review requires reachable supported setup, sample-data reviewer access if authentication is needed, five positive and three negative tested cases, a walkthrough, and policy review. Website/source publication is a separate milestone. This project has not performed reviewer-account setup, domain verification, legal attestations, or directory submission.

Signed-in Codex reads remain native and explicitly initiated; hosted aggregate display does not reach a user's local App Server. There is no historical per-message subscription billing attribution or global prompt interception. Admin credentials, if a user later provisions them, belong only in the native process environment, never in the hosted widget or a plugin ZIP.
