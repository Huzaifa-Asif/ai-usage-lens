# Architecture

The browser loads from a loopback-only Node server. Two explicit POST-only same-origin collection routes invoke fixed read-only collectors after strict Host/Origin validation. The Admin key remains in the server process environment and never reaches the renderer. The server has no upload, persistence, arbitrary proxy, or telemetry route; CSP permits only same-origin fetches.

`src/core.js` is the shared validation, pricing, aggregation, suggestion, and safe-rendering core. `src/codex-adapter.js` converts explicitly captured App Server events without inspecting transcripts. `src/cli.js` produces a machine-readable local summary. `public/app.js` is a thin browser controller.

Cost formula per request:

```text
uncached input = input - cached input
estimate = uncached input × input rate
         + cached input × cached-input rate
         + cache-write input × cache-write rate
         + output × output rate
```

All rates are per million tokens. Cached and cache-write input are non-overlapping subsets of input; reasoning tokens are informational within output and never added again. Any required missing rate makes the request's cost unknown.

Trust boundaries: JSON strings are untrusted data, rendered through HTML escaping; files are size-limited; no imported content becomes an instruction to a model. Optimization text comes only from built-in rules, not imported prompts.
