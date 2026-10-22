# GrowLog MVP tasks

Status keys: `[ ]` pending, `[~]` in progress, `[x]` verified.

## P0 foundation

- [x] M0 — Establish architecture, task ledger, executable Next.js/TypeScript baseline, lint, typecheck, tests, and production build.
  - Acceptance: project state files exist; commands are documented; `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` pass.
- [x] M1 — PostgreSQL and Prisma persistence foundation.
  - Acceptance: normalized schema covers the P0 entities, household isolation, timestamps, sources, soft deletion, audit events, indexes, and a reproducible migration; database integration test passes.
- [x] M2 — Single-administrator authentication and access protection.
  - Acceptance: no public signup; password verification uses a slow hash; secure HttpOnly session cookie; logout and expiry work; protected pages and APIs reject anonymous requests; CSRF protection is applied to mutations.

## P0 records

- [x] M3 — Child profile create, view, and edit.
  - Acceptance: name, birth date, sex, optional birth measurements and parent heights validate; all access is household scoped; audit history is produced.
- [x] M4 — Growth measurements and trends.
  - Acceptance: create/list/edit/soft-delete/restore height and weight records with date, source, method, location, device, precision, and notes; BMI and change over time are computed only when inputs permit; chart displays history; no fabricated percentiles.
- [x] M5 — Sleep records.
  - Acceptance: night and nap intervals support crossing midnight; waking duration cannot exceed the interval; daily totals and 7/30-day summaries are tested; CRUD and history work.
- [x] M6 — Meals, foods, milk, and water.
  - Acceptance: meal slots and items distinguish offered, consumed, and estimated amounts; beverage entries preserve units; missing quantity remains unknown; CRUD and daily totals work.
- [x] M7 — Physical and outdoor activity.
  - Acceptance: type, duration, intensity, context, and outdoor minutes validate; outdoor time remains distinct from moderate/vigorous exercise; CRUD and weekly summaries work.
- [x] M8 — Emotion records.
  - Acceptance: quick overall mood plus optional tags, context, interaction, duration, and notes; CRUD and trend counts work; UI and copy avoid diagnostic claims.

## P0 experience and operations

- [x] M9 — Mobile Dashboard and quick entry.
  - Acceptance: within one view a parent can see today’s completed/missing categories, latest growth, recent sleep, today’s milk/water, activity, mood, and cautious trend notices; common entries take no more than a short mobile form.
- [x] M10 — Historical editing, deletion, restoration, and audit view.
  - Acceptance: every P0 record can be edited and soft deleted; authorized restore works; audit events show actor, action, entity, time, and redacted change metadata.
- [x] M11 — JSON/CSV export.
  - Acceptance: authenticated household export includes versioned JSON and per-domain CSV with explicit units and timestamps; deleted records are opt-in; tests verify isolation and escaping.
- [x] M12 — PWA support.
  - Acceptance: installable manifest, icons, service worker/app shell, offline fallback, and update behavior pass manifest and build checks; sensitive API responses are never cached.
- [x] M13 — Docker Compose, Caddy, health checks, backup and restore.
  - Acceptance: Compose starts app/PostgreSQL/Caddy with persistent volumes; health endpoint verifies app and database; backup script creates a timestamped PostgreSQL dump; restore targets a named database and includes a verification procedure.
- [x] M14 — End-to-end verification and security review.
  - Acceptance: core login, create/query/edit/delete/restore flows pass; API validation/error format is consistent; dependency/build/test checks pass; deployment and backup restore smoke tests are recorded.
- [x] M15 — Mobile-first application interface and interaction audit.
  - Acceptance: protected pages have no unintended horizontal overflow from 320–430px; four-item mobile navigation switches to desktop navigation at 760px and exposes the current page; inputs use at least 16px text, touch targets at least 44px, and primary controls at least 48px; all six record forms progressively disclose optional values and reopen them for populated edits; delete requires confirmation while restore remains direct; settings provides CSRF-safe logout; Dashboard and child-detail actions support one-handed use; pending/success/error states use consistent accessible semantics; light/dark themes retain clear contrast; existing business, isolation, export, PWA, security, test, typecheck, lint, and production-build contracts remain verified.

## Deferred after MVP

- [ ] P1 — Upgrade to Prisma 7 and Next.js 16, rerun database/deployment migrations, and close the reviewed transitive dependency advisories.
- [ ] P1 — Verified WHO/CDC reference curves, reports, health events, data-quality analysis, and kindergarten image extraction with human confirmation.
- [ ] P2 — Multiple children, family collaboration, milestones, reminders, richer longitudinal analysis, and visit reports.
