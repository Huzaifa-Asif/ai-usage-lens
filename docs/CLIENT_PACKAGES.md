# Native client packages

`npm run build:clients` creates three audited, credential-free packages under `dist-clients/`. Each package contains the same portable Agent Plugin and offline `token-lens` skill. `checksums.json` records every other packaged regular file's SHA-256 digest and byte count; the build fails on symlinks and special filesystem entries.

## Codex and ChatGPT desktop

Use `dist-clients/codex/ai-usage-lens`. It has the canonical root `plugin.json` plus the supported `.codex-plugin/plugin.json` compatibility manifest. For local testing, copy it to a local plugin directory and add it through a personal or repository marketplace. Installing or enabling it changes client configuration, so the user must perform or explicitly authorize that step.

## Claude Code

Use `dist-clients/claude/ai-usage-lens`. It has Claude Code's `.claude-plugin/plugin.json` manifest and a root `skills/token-lens/SKILL.md`. Test it for one session with `claude --plugin-dir /absolute/path/to/dist-clients/claude/ai-usage-lens`. Persistent installation and marketplace changes are intentionally not automated.

## Cursor

Use `dist-clients/cursor/ai-usage-lens`. Cursor natively loads the portable Agent Plugin format because the package has `plugin.json` at its root. For a local test, copy the package into `~/.cursor/plugins/local/ai-usage-lens`, reload Cursor, and verify the skill in Customize. The build does not modify that directory or enable cloud skill sync.

## Scope and live data

These packages analyze only files the user selects. They include no MCP server, hook, collector, account credential, background service, or transcript reader. Live Codex usage reads remain a separate, explicitly launched local companion. Cursor team usage requires its documented Admin API credential outside the browser. Claude subscription usage is not presented as a billable token API. A signed-in browser session alone is not API authorization.

References checked 2026-10-14: OpenAI's Agent Plugins packaging guide, Claude Code's plugin overview, and Cursor's Plugins and Agent Skills documentation.
