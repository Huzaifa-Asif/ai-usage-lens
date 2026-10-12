# Security

Report vulnerabilities privately to the repository owner. Do not include real API keys, credentials, proprietary prompts, or customer data in reports.

The app binds to `127.0.0.1`. Its two explicit POST-only collection routes require matching loopback Host/Origin and expose no arbitrary destination or method. The renderer never receives credentials. The server and optional Admin CLI read `OPENAI_ADMIN_KEY` only from their process environment and send it only to two fixed `https://api.openai.com` organization GET endpoints; redirects are rejected and the key is never written or logged. CSP, import limits, numeric validation, safe rendering, response bounds, and sanitized error allowlists remain enforced.

Supported MVP version: 0.2.x. This source release does not operate a hosted service or security bounty. Static deployment security headers must be configured as described in docs/DEPLOYMENT.md.
