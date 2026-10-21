# M10 Unified History and Audit Plan

**Goal:** Provide one protected place to review all P0 records, reach their edit/delete/restore controls, and inspect redacted audit events.

**Architecture:** A household-scoped history repository reads active or optionally deleted records across growth, sleep, nutrition, activity, and emotion, normalizes them into a reverse-chronological timeline, and lists recent audit events. The server-rendered History page links each entry to its existing domain lifecycle UI and shows actor/action/entity/time plus changed field names only.

## Tasks

1. Add a failing PostgreSQL test for household isolation, deleted filtering, cross-domain ordering, and redacted audit output.
2. Implement the unified history/audit repository.
3. Add a protected History page, deleted-record toggle, domain links, and main navigation entry.
4. Verify every P0 domain page retains edit/delete/restore controls.
5. Run database reset, full tests, lint, typecheck, build, and protected HTTP smoke.
6. Update durable state files and commit M10.
