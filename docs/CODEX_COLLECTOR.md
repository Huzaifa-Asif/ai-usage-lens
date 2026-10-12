# Optional Codex App Server collector

AI Usage Lens includes an optional, user-invoked, read-only stdio collector for an already installed and already authenticated Codex App Server. It is disconnected by default. Development and tests use only a local stub process; no real account integration was exercised.

## Account-access notice

Running the command below asks the local Codex App Server for two documented account reads: `account/rateLimits/read` and `account/usage/read`. The resulting file can contain account quota status, reset times, token-activity summaries, and optional provider estimates. Review it before sharing.

The collector does not start or read threads, request transcript content, begin turns, log in, read credentials, install hooks, consume reset credits, change models/speed, or modify prompts/settings. It performs no login flow. Existing Codex authentication and method availability determine whether reads succeed.

## Explicit live invocation

```sh
npm run collect:codex -- --live --output ./my-codex-capture.json
```

For a documented thread-specific usage estimate, add an opaque thread ID:

```sh
npm run collect:codex -- --live --output ./thread-capture.json --thread-id THREAD_ID
```

To select an installed executable explicitly:

```sh
npm run collect:codex -- --live --output ./capture.json --codex /absolute/path/to/codex
```

`--live` is mandatory. Output is created once with owner-only permissions and never overwritten. The CLI prints an account-access notice before spawning `codex app-server`. Import the resulting file with **Import limits**; AI Usage Lens uses its normalized quota snapshot and retains the raw documented responses for auditability.

## Safety and limitations

- Strict outbound allowlist: initialize handshake, `account/rateLimits/read`, and `account/usage/read` only.
- Fixed argument array and `shell: false`; no user input is evaluated as shell text.
- 8-second default timeout, 1 MiB per-stream bound, 2 MiB serialized capture bound, cancellation and process cleanup.
- Server/stderr content is never included in errors; error codes are generic.
- A stub verifies handshake, nulls, malformed responses, version mismatch, timeout, cancellation, output limits, cleanup, and method restrictions.
- Stub success proves client behavior, not real account compatibility. App Server versions, authentication modes, and returned fields can vary. The collector never labels fixtures as live data.
