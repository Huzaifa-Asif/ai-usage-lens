# AI Usage Lens — local skills-only plugin

This package analyzes usage ledger and price JSON files the user selects. Node 20+ is required. It installs no dependencies, hooks, MCP server, account connector, telemetry or persistent service.

Try the bundled synthetic example from the extracted plugin root:

```sh
node src/cli.js examples/ledger.json examples/prices.json
```

Expected result: 1,200 measured tokens and USD 0.00288 dated-rate estimate. The example prices are synthetic. Input is capped at 10 MB per file; unknown values stay unavailable.

Use a supported local Codex plugin host to add the extracted root as a marketplace. Official CLI tooling provides:

```sh
codex plugin marketplace add /absolute/path/to/extracted/plugin
codex plugin add ai-usage-lens@ai-usage-lens-local
```

These commands modify local plugin configuration only when the user runs them. Install/test UI availability varies by client. [LOCAL_PLUGIN.md](docs/LOCAL_PLUGIN.md) describes supported setup and verification limits. The skill is `token-lens` inside the `ai-usage-lens` plugin namespace.

The separate [hosted dashboard](https://ai-usage-lens.vercel.app/) supports demo/import analysis. Live signed-in Codex quota reads require the full source distribution's native companion; they are not part of this plugin ZIP and cannot expose unseen historical per-message subscription costs.

[Privacy](PRIVACY.md), [security](SECURITY.md), [support](SUPPORT.md), [contribution](CONTRIBUTING.md), [code of conduct](CODE_OF_CONDUCT.md), and MIT [license](LICENSE) accompany this package. No public directory approval or publication is implied by local installation.
