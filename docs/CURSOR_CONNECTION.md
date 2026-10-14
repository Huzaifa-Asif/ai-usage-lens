# Cursor team usage connection

AI Usage Lens can make an explicit, one-shot read of the official Cursor Team Admin API through the local companion. This is a team-admin integration, not a personal Cursor OAuth flow and not local credential discovery.

## Configure outside the browser

Create or obtain a Cursor Team Admin API key using Cursor's official administration flow, then start the local companion with the value in the process environment:

```sh
CURSOR_API_KEY=… npm start
```

Do not paste the key into AI Usage Lens. The page has no credential field. The server sends the key only to fixed `https://api.cursor.com` endpoints using the documented Basic Authentication form and never returns or logs it.

The **Connect Cursor once** action reads the trailing 30 days from `/teams/daily-usage-data` plus current-cycle `/teams/spend`. The result is held in browser memory and is not automatically refreshed.

## Data boundary

- The local companion collapses member rows into one aggregate per day before returning data to the browser. Names, email addresses, user IDs, and roles are discarded.
- Daily aggregates include activity counts and a most-used model when Cursor supplies them.
- The companion follows all documented spend pages, then reduces member rows to separate sums of `spendCents` (on-demand) and `overallSpendCents` (included plus on-demand), plus identity-free row counts. Missing values remain unavailable rather than becoming zero. Subscription-included requests remain utilization, not API-dollar cost.
- These endpoints do not provide local conversation text or per-message token counts. AI Usage Lens labels those fields unavailable rather than estimating them.
- Authentication, permission, rate-limit, timeout, malformed-response, and network failures are reduced to bounded error codes; response bodies and credentials are not exposed.

Official references: https://cursor.com/docs/account/teams/admin-api and https://cursor.com/docs/analytics-api
