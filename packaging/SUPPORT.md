# Skills-only package support

Requires Node 20+; no dependency install or server is needed. Run `node src/cli.js examples/ledger.json examples/prices.json` from the extracted root. Quote paths containing spaces.

`input_too_large` means a file exceeds 10 MB. `input_not_regular_file` excludes directories/FIFOs. `invalid_json` means malformed JSON or UTF-8. `input_unavailable` means the file cannot be read. Ledger validation errors identify fields. Unknown prices require a matching dated user-supplied rate; cumulative records must not be summed as request deltas.

CLI arrays are capped at 100 with explicit omitted counts; aggregate totals are exact. Complete request drill-down needs the separate full application. Native install and undo are documented in `docs/LOCAL_PLUGIN.md`; host acceptance is not verified here.

Report issues to the repository owner with version, Node version and a synthetic reproducer. Never include secrets, actual prompts or private account records.
