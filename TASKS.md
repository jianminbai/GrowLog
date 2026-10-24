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
- [x] M16 — View-first child profile detail.
  - Acceptance: the default child profile page shows a compact read-only summary and health-record entry points without rendering the edit form; a dedicated authenticated edit route reuses existing validation and audit behavior; successful edits return to the profile detail; focused and full release checks pass.
- [x] M17 — Compact date-grouped history and low-frequency data management.
  - Acceptance: active history retains all summary fields in compact cards grouped by household-local day; a deliberate right swipe or keyboard action reveals the edit link; daily domain pages exclude deleted records; settings links to an authenticated household-scoped page that restores deleted records with CSRF protection and shows redacted audit events; focused and full release checks pass.

- [x] M18 — Read-only child reports and settings-based record management.
  - Acceptance: empty profiles offer Add child; populated profiles never show creation forms; all five child domains show time-based charts and complete read-only tables; growth height/weight have separate labeled axes with actual time spacing; missing values remain unknown; settings hosts child creation, basic profile editing and all existing record editors; Today and History entry links continue to work; authentication, household isolation, full checks and mobile browser verification pass.
- [x] M19 — Interactive profile charts, annualized height growth, and history visual refinement.
  - Acceptance: chart points expose household-local time and exact values to pointer, touch, and keyboard users; chart motion respects reduced-motion preferences; the growth table calculates retrospective annualized height growth only between valid measurements with a positive interval; History shows a compact date-based timeline, record/day overview, category markers, and a visible swipe affordance while preserving all details and the existing swipe/keyboard edit behavior; focused tests and 320/390/768 px browser checks pass.
- [x] M20 — Today dashboard, compact growth table, and grouped settings navigation.
  - Acceptance: Today presents only household-local completion, same-day values, and quick entry without loading historical growth or presenting latest/trend blocks; missing milk, water, sleep, and outdoor values remain unknown, including partial-data indicators; the growth table removes head circumference, places annualized height growth third, and preserves measurement context in an accessible disclosure; Settings groups children/records, data/backup, and account actions into touch-safe menu rows; focused/full tests, lint, typecheck, production build, review, and 320/390/768 px browser checks pass.
- [x] M21 — Recorded-day comparisons and mobile information-architecture polish.
  - Acceptance: Today compares each metric with the preceding seven household-local calendar days excluding today, divides only by days with complete recorded values, shows sample-day counts, and never converts missing or partial values to zero; growth measurement tables and growth-chart point labels use `YYYY-MM-DD`; desktop and mobile navigation use “今天/足迹/趋势/设置”; History is titled “成长足迹”; active meal and beverage history uses consistent expandable cards with localized summaries plus grouped save/delete actions; green, orange, and red have distinct primary/accent/danger roles; focused/full tests, lint, typecheck, production build, review, and authenticated 320/390/768 px browser checks pass.
- [x] M22 — Compact Footprints, single-line measurement dates, and multi-window Today comparisons.
  - Acceptance: Footprints omits time-of-day and swipe/edit controls, renders each active record as a compact row with the title on the left and category/child/value on the right, and leaves editing under Settings; growth measurement dates remain `YYYY-MM-DD` on one line; each Today metric occupies one full-width row with compact Today/7-day/14-day/30-day values, previous windows exclude today and preserve complete-recorded-day averaging and unknown-value semantics, while emotion windows show the most frequently recorded observation; focused/full tests, lint, typecheck, production build, review, and authenticated 320/390/768 px height/overflow checks pass.
- [x] M23 — Concise dashboard/trend copy and compact growth-table alignment.
  - Acceptance: Today and Trends headers describe their current user tasks; redundant report timezone/management and chart-interaction instructions are absent; growth measurement headers and cells stay centered, vertically aligned, and on one line while the details summary retains a 44px touch target; focused/full tests, lint, typecheck, production build, review, and authenticated 320/390/768 px row-height/overflow checks pass.
- [x] M24 — Modern minimalist full-application visual refresh.
  - Acceptance: public, authentication, Today, Footprints, Trends, Settings, recovery, and all record editors share a neutral card hierarchy, violet brand actions, semantic success/warning/danger colors, and one inline line-icon system; light and dark themes keep explicit readable foreground/background pairs; 320/390/430/768 px browser checks cover long content, expanded editors, fixed navigation, input sizing, breakpoints, and page-level overflow; business rules, routes, APIs, persistence, security, and household isolation remain unchanged; focused/full tests, lint, typecheck, production build, review, and visual inspection pass.
- [x] M25 — Child-scoped kindergarten document uploads.
  - Acceptance: Settings offers separate daily care-sheet and weekly-menu JPEG/PNG/WebP uploads for active children; one care sheet is stored per child/day and one menu per child/Monday-based week, with same-period uploads replacing the prior image; multipart bodies are bounded before parsing, file signatures match MIME, private random storage keys never enter API responses, and authenticated image reads are private/no-store; list/view/delete and replacement are household scoped and audited without filenames, paths, or file content; Docker persists files in a named volume and coordinated database/image backup and guarded restore are verified; focused/full tests, lint, typecheck, production build, mobile browser checks, persistence/recovery acceptance, and independent review pass.
- [x] M26 — Fixed measurement-date column in growth trends.
  - Acceptance: the growth measurement table keeps its date header and date cells visible while the remaining columns scroll horizontally; fixed cells use opaque theme-aware backgrounds and a clear divider; other report tables keep their existing scrolling behavior; focused/full tests, lint, typecheck, and production build pass.
- [x] M27 — Constrain native date controls on narrow screens.
  - Acceptance: all native date, date-time, month, week, and time inputs can shrink to their form container and never exceed its width; existing touch sizing and browser-native picker behavior remain intact; the CSS regression, full tests, lint, typecheck, and production build pass.

## Deferred after MVP

- [ ] P1 — Upgrade to Prisma 7 and Next.js 16, rerun database/deployment migrations, and close the reviewed transitive dependency advisories.
- [ ] P1 — Verified WHO/CDC reference curves, reports, health events, data-quality analysis, and kindergarten image extraction with human confirmation.
- [ ] P2 — Multiple children, family collaboration, milestones, reminders, richer longitudinal analysis, and visit reports.
