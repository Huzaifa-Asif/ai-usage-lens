# Local plugin installation and architecture

The portable entry point is `plugin.json`; `skills/token-lens/SKILL.md` is discovered at the documented root path. The retained `skill/token-lens` source alias is only a compatibility forwarder. Marketplace metadata is authored in `packaging/marketplace.json` and generated under `.agents/plugins/marketplace.json` inside the distribution. The workspace's protected agent configuration is not edited.

## Build and clean use

From the full source root, run `npm run build:plugin`. The result `dist-plugin/` contains the offline CLI/core, skill, synthetic examples, schema documentation, original icon, MIT and governance documents. It excludes collectors, server, hooks, credentials, captures and account data. The CLI works from the extracted package with Node 20+ and no install step.

```sh
node src/cli.js examples/ledger.json examples/prices.json
```

The expected synthetic result is 1,200 measured tokens and USD 0.00288 estimate. Use full paths when invoking the installed skill. JSON inputs are capped at 10 MB and file failures are sanitized.

## Supported client setup

The [official package guide](https://developers.openai.com/plugins/build/plugins) supports repo/local marketplaces and instructs authors to use the desktop plugin host for installation testing. Current CLI commands also expose marketplace/add tooling:

```sh
codex plugin marketplace add /absolute/path/to/extracted/plugin
codex plugin add ai-usage-lens@ai-usage-lens-local
codex plugin list --marketplace ai-usage-lens-local --available --json
```

Use the host's plugin setup/install UI when required by that version. Confirm AI Usage Lens and the `token-lens` skill appear. To undo a user-performed install, use `codex plugin remove ai-usage-lens@ai-usage-lens-local`, then `codex plugin marketplace remove ai-usage-lens-local`. Check CLI help if your installed version uses different selectors. These user-run steps change plugin configuration; they are never executed by the analysis skill.

Automated checks validate the manifest, referenced paths, icons, generated archive and runnable analysis. They do not prove a native host installation, LLM skill selection, or portal approval. Clean extracted package testing requires no sign-in or account reads.

## Distribution states

| Surface | Capability and status |
|---|---|
| Portable local plugin | Offline analysis only; package/clean-use tested |
| Hosted static dashboard | Demo/import display; collectors disabled |
| Full source/native companion | Explicit supported Codex account reads, isolated from hosted/plugin output |
| Public directory | Skills-only package is a supported submission shape; metadata/identity/skill scans and human review remain required |

A future remote MCP integration cannot currently be added to an already published skills-only listing; choose the listing architecture deliberately before submitting. The full companion is not a remote MCP endpoint. Source publication, local installation, hosted deployment, submission, approval and directory publication are separate outcomes.
