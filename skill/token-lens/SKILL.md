---
name: token-lens
description: Analyze user-provided Token Lens ledgers and generate honest usage/cost optimization guidance.
---

# Token Lens

Use this skill only with files the user explicitly provides or identifies. Validate them with `npm run cli -- <ledger> <prices>` from this project.

Report measured tokens, missing usage, unknown prices, currencies, and rate provenance separately. Call calculated money an estimate, never actual provider billing. Reasoning is already within output; cached input is within input. Never infer unseen ChatGPT/Codex transcript data, scrape session files, request admin/API keys, or equate subscription usage with API charges.

For optimization, explain the observed evidence and produce a user-applied checklist. Do not silently rewrite prompts, remove constraints or safety context, install hooks, or change Codex/ChatGPT settings. A Codex `UserPromptSubmit` hook may add developer context when deliberately configured by the user; it does not replace the prompt.
