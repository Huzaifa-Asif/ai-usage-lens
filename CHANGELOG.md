# Changelog

## 0.2.1 — October 13 MYT maintenance

- Cancel aborts the matching browser request and propagates through HTTP disconnect to the bounded local collector.
- Late cancelled results cannot refill views after Cancel, demo, import, or disconnect.
- One collection runs at a time in the browser and companion; Codex and Admin cancel controls cannot cancel each other.
- Added synthetic UI, HTTP lifecycle, and ownership regressions. Hosted collectors remain disabled.

## Release preparation — 2026-10-12

- Show available Codex account activity separately from request-ledger analysis.
- Clarify the empty request-ledger state after account connection and hide account identifiers in quota labels.
- Build a static hosted edition with collection disabled away from loopback; retain the local companion for signed-in reads.

## Product name finalized — 2026-10-12

- Renamed the interface, display titles, documentation, and delivery notes to AI Usage Lens.
- Kept established schemas, package/client identities, skill path, and browser storage keys compatible.

## 0.2.0 — 2026-10-12

- Added a strict, optional read-only Codex App Server collector and synthetic protocol fixture.
- Made the explicit local connection handoff the primary UI flow, with permission, cancellation, error, connected-snapshot, and refresh states.
- Added capture provenance, owner-only output, process/output bounds, and collector hardening tests.

## 0.1.0 — 2026-10-12

- Added offline thread/request usage explorer, dated cost estimates, integrity gaps, and optimization previews.
- Added normalized ledger, Responses object, and captured Codex token-event adapters.
- Added CLI, schemas, synthetic demo, local skill, documentation, and automated tests.
- Added an opt-in, read-only Codex App Server account usage/rate-limit collector with bounded stubbed transport tests.
