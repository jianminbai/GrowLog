# GrowLog progress

## Current state

- Repository started from commit `5d306a3` with only an Apache 2.0 license.
- Product brief reviewed and MVP/P1/P2 boundaries recorded.
- Architecture, durable task tracking, and an executable Next.js application baseline are established on branch `work`.

## Completed and verified

- Git remote read access and repository integrity were verified during environment onboarding.
- M0 application baseline: mobile-first landing shell, typed API result envelopes, security headers, and health endpoint.
- Task 1 RED: `npm test -- src/lib/result.test.ts` failed because `src/lib/result.ts` did not exist.
- Task 1 GREEN: 2/2 result-envelope tests passed; lint, strict typecheck, and the Next.js production build exited 0.
- M1 PostgreSQL foundation: Prisma Client 6.19.2 generated, the initial migration was created and applied to PostgreSQL 16, schema validation passed, and household isolation plus transactional audit creation passed against the real database.
- M2 administrator authentication: Argon2id verification, digest-only database sessions, secure cookies, expiry/revocation, protected pages, same-origin and CSRF mutation checks, and logout are verified.
- M3 child profiles: validated create/list/view/edit APIs and mobile pages are household scoped; optional birth/parent measurements persist; create/update mutations append redacted audit metadata.
- M4 growth history: household-scoped create/list/edit/soft-delete/restore APIs, redacted audit events, cautious BMI/change calculations, and a mobile history/trend page are verified.
- M5 sleep history: night/nap intervals, cross-midnight validation, net duration, household-timezone daily attribution, 7/30-day summaries, full lifecycle APIs, audit events, and mobile UI are verified.
- M6 nutrition: meal items preserve offered/consumed/estimated amounts, beverages preserve unknown volume, lifecycle APIs and audit trails are household scoped, and mobile daily totals/history are implemented.
- M7 activity: activity type, duration, intensity, structure, source/context, participation, and outdoor minutes validate; lifecycle APIs and audit trails are household scoped; the mobile page shows independent weekly totals for all activity, outdoor time, and moderate/vigorous activity.
- M8 emotion observations: bounded moods, normalized tags, context, optional duration, peer/parent interactions, notes, and source validate; household-scoped lifecycle APIs, audit events, descriptive 7/30-day counts, and a non-diagnostic mobile UI are verified.
- M9 Today dashboard: each household child receives timezone-aware completed/missing states, latest growth and sleep, daily nutrition/activity/mood values, cautious 7-day notices, and direct mobile quick-entry links.
- M10 history/audit: a protected household timeline unifies every P0 record type, optionally shows deleted records, links back to lifecycle controls, and renders actor/action/entity/time with changed field names only. The lifecycle review also added the missing nutrition edit forms.
- M11 export: authenticated versioned JSON and eight per-domain UTF-8 CSV downloads are household isolated, use explicit unit/timestamp columns, redact audits, omit sessions, escape spreadsheet text, and include soft-deleted rows only by request.
- M12 PWA: installable standalone manifest, 192/512 icons, update-aware service-worker registration, public offline fallback, and static-shell caching are implemented; API and authenticated navigation responses never enter Cache Storage and API headers enforce private no-store.
- M13 deployment and recovery: Node 24 production image stages, PostgreSQL 16, Caddy, persistent volumes, dependency-aware health checks, idempotent household bootstrap, checksummed backups, guarded named-database restores, and an operator runbook are implemented and smoke-tested.
- M14 end-to-end and security review: a reusable authenticated HTTP smoke script verifies the complete P0 lifecycle and API contract through Caddy; security controls and dependency advisories are documented with explicit follow-up work.
- M15 mobile-first interface: the protected application now has four-item mobile navigation, a 760px desktop navigation breakpoint, one-handed Dashboard and child-domain entry points, progressively disclosed optional form fields, confirmed destructive actions, accessible status messages, safe account logout, and a responsive light/dark visual system.
- Repository documentation: the root README provides an accurate Chinese product overview, Docker/VPS quick start, development checks, backup/restore entry points, security boundaries, and links to durable project records.

## Current task

- All GrowLog MVP milestones M0–M16 are implemented and verified. Deferred P1/P2 work remains listed in `TASKS.md`.

## Test record

- `npm test -- src/lib/result.test.ts`: 2 passed, 0 failed (2026-10-21).
- `npm run lint`: passed with zero warnings (2026-10-21).
- `npm run typecheck`: passed (2026-10-21).
- `npm run build`: passed; `/`, `/_not-found`, and `/api/health` were emitted (2026-10-21).
- `DATABASE_URL=... npm run prisma:validate`: passed with Prisma CLI 6.19.2 (2026-10-21).
- `DATABASE_URL=... npm test -- tests/integration/database.test.ts`: 3 passed, 0 failed, including household isolation and Prisma-backed sessions (2026-10-21).
- `npm run lint`: passed with zero warnings after generated-client adapter fixes (2026-10-21).
- `npm run typecheck`: passed with generated Prisma types (2026-10-21).
- `DATABASE_URL=... npm test`: 17 passed, 0 failed across 5 files (2026-10-21).
- `DATABASE_URL=... npm run build`: passed; protected and authentication routes emitted (2026-10-21).
- Production HTTP smoke: health 200, login 200, session 200, logout 200, and revoked session 401 against PostgreSQL (2026-10-21).
- M3 validation RED→GREEN: 7 profile schema cases pass; handler RED→GREEN: 4 authentication/CSRF/validation/isolation cases pass (2026-10-21).
- M3 database integration: 2 profile tests pass for optional measurements, household list/update isolation, and redacted audit field names (2026-10-21).
- `npm run db:test:prepare`: initial migration reapplied and Prisma Client regenerated successfully (2026-10-21).
- M3 final gate: lint and generated-client typecheck pass; 30 tests across 8 files pass; production build emits child APIs and pages (2026-10-21).
- M3 production HTTP smoke: child create 201; list/update/detail and `/children` pages 200; logout 200; revoked session 401 (2026-10-21).
- M4 domain RED→GREEN: 8 validation/BMI/change cases pass; repository RED→GREEN: 2 PostgreSQL ownership/lifecycle/audit cases pass; handler RED→GREEN: 3 auth/validation/serialization cases pass (2026-10-21).
- M4 final gate: test database reset passed; lint and generated-client typecheck pass; 43 tests across 11 files pass; production build emits all growth API and page routes (2026-10-21).
- M4 production HTTP smoke: growth create 201; list/update/delete/restore and history page 200; restored data remains available (2026-10-21).
- M5 RED→GREEN: 4 interval/summary domain cases, 1 PostgreSQL lifecycle case, and 1 handler summary case pass (2026-10-21).
- M5 final gate: lint/typecheck and production build pass; database reset succeeds; 49 tests across 14 files pass (2026-10-21).
- M5 production smoke: sleep create 201 with 450 net minutes; list/update/delete/restore and mobile page return 200 (2026-10-21).
- M6 final gate: nutrition domain/handler/database suites pass; full database reset succeeds; 55 tests across 17 files pass; lint/typecheck and production build pass (2026-10-21).
- M7 RED→GREEN: 5 activity validation/summary cases, 2 authenticated handler cases, and 1 PostgreSQL ownership/lifecycle/audit case pass (2026-10-21).
- M7 final gate: full database reset succeeds; lint and typecheck pass; 63 tests across 20 files pass; production build emits activity API/page routes; production HTTP smoke returns health 200 and anonymous activity API 401 (2026-10-21).
- M8 RED→GREEN: 5 emotion validation/summary cases, 2 authenticated handler cases, and 1 PostgreSQL ownership/lifecycle/audit case pass (2026-10-21).
- M8 final gate: full database reset succeeds; lint and typecheck pass; 71 tests across 23 files pass; production build emits emotion API/page routes; production HTTP smoke returns health 200 and anonymous emotion API 401 (2026-10-21).
- M9 dashboard RED→GREEN: 2 household-timezone aggregation cases pass for completion state, null preservation, latest records, daily totals, and cautious notices (2026-10-21).
- M9 final gate: lint/typecheck pass; 73 tests across 24 files pass; production build emits the dynamic Today page; production HTTP smoke redirects anonymous `/today` to login and renders a household-scoped child dashboard with status 200 for a valid session (2026-10-21).
- M10 RED→GREEN: PostgreSQL history test verifies household isolation, deleted filtering, reverse ordering, and redacted audit output; a UI test verifies active meal and beverage edit controls (2026-10-21).
- M10 final gate: database reset, lint/typecheck, 75 tests across 26 files, and production build pass; authenticated `/history` smoke returns 200 with the scoped child and changed field while anonymous access redirects to login (2026-10-21).
- M11 export test verifies JSON versioning, household isolation, deleted opt-in, explicit unit headers, and CSV comma/quote/newline escaping (2026-10-21).
- M11 final gate: database reset, lint/typecheck, 76 tests across 27 files, and production build pass; anonymous export returns 401, authenticated JSON/CSV return 200 attachments with `private, no-store`, expected content types, version 1, and UTF-8 child data (2026-10-21).
- M12 manifest/cache-policy tests pass; full reset and 78 tests across 28 files, lint/typecheck, and production build pass (2026-10-21).
- M12 production smoke: manifest, service worker, offline fallback, and 192/512 PNG icons return 200 with correct types; API health responses include `Cache-Control: private, no-store, max-age=0` (2026-10-21).
- M13 health RED→GREEN: database connectivity failure returns a generic 503 problem and a successful query returns 200 with `database: ok`; 2 handler cases pass (2026-10-21).
- M13 final code gate: test database reset, lint, typecheck, 80 tests across 29 files, production build, shell syntax, Compose resolution, and the exact Dockerfile BuildKit check pass (2026-10-21).
- M13 deployment smoke: the Node 24 production stages built into `growlog-app:local`; Compose started PostgreSQL, the application, and Caddy; both database and application reached healthy state; proxied `/api/health` returned 200 with database status and security/no-store headers (2026-10-21).
- M13 recovery smoke: checksummed custom-format dumps restored into a separate named database; source/target migration, household, and child counts matched; primary-database overwrite was refused unless explicitly enabled (2026-10-21).
- M14 authenticated HTTP smoke: 57 requests through Caddy verify anonymous and invalid-input errors, secure cookie attributes, session resolution, missing-CSRF and cross-origin rejection, child create/edit, all six record-domain create/query/edit/delete/deleted-query/restore flows, protected Today/History pages, JSON export, logout, and revoked-session rejection (2026-10-21).
- M14 API contract review: success and error envelopes, field errors, private no-store headers, generic authentication/database failures, and household scoping are covered by the HTTP smoke plus handler and PostgreSQL integration tests (2026-10-21).
- M14 dependency review: `npm audit --omit=dev --json` reports 0 critical, 1 moderate, and 5 high dependency nodes. Remediation requires breaking Prisma 7.10.1 and Next.js 16.4.2 upgrades; current exposure is restricted to trusted CLI/build inputs and the migration is tracked as P1 in `docs/SECURITY_REVIEW.md` (2026-10-21).
- M14 final gate: clean test-database reset, lint with zero warnings, sequential typecheck, 80/80 tests across 29 files with PostgreSQL enabled, production build, healthy three-service Compose stack, and proxied database-aware health response all pass (2026-10-21).
- M15 focused verification: navigation, logout, progressive disclosure, form lifecycle, domain-link, profile grouping, dashboard, CSS-contract, and login tests pass; typecheck and production build pass (2026-10-22).
- M15 viewport verification: authenticated pages at 320×568, 375×667, 390×844, 430×932, and 768×1024 have no page-level horizontal overflow; mobile/desktop navigation switches at 760px and current-page state is correct on Today, History, Children, child detail, and Settings (2026-10-22).
- M15 whole-branch review fixes: meal amount and unit are visible together, notice colors are contrast-tested in both themes, secondary/restore controls meet the 44px target, and sleep deletion cannot be repeated while pending (2026-10-22).
- M15 final gate: clean test-database reset, lint with zero warnings, typecheck, 114/114 tests across 37 files with PostgreSQL enabled, and the production build all pass (2026-10-22).
- M16 RED→GREEN: detail-page tests require a read-only summary without profile inputs, the dedicated edit-page test requires the existing populated form, and the form test requires successful edits to return to the detail page (2026-10-22).
- M16 review fixes: successful profile saves keep the submit control disabled during navigation to prevent duplicate writes, and multi-line notes preserve their authored line breaks in the read-only summary; 8 focused tests pass (2026-10-22).
- M16 final gate: clean test-database reset, lint with zero warnings, typecheck, 117/117 tests across 39 files with PostgreSQL enabled, and the production build including `/children/[childId]/edit` all pass (2026-10-22).

## Work implemented

- M1 schema: all P0 PostgreSQL/Prisma entities, household scoping, timestamps, sources, soft deletion, indexes, sessions, and audit events are defined in `prisma/schema.prisma` and captured by the initial migration.
- PostgreSQL 16 test Compose configuration starts and reaches healthy state on port 55432.
- The child repository and integration tests specify transactional child/audit creation and cross-household isolation.
- M2 authentication domain: generic credential failures, Argon2id adapter, random session/CSRF credentials, SHA-256 digest storage, 30-day expiry, revocation, and constant-time CSRF comparison.
- M2 HTTP/UI boundary: validated login/logout/session handlers, secure cookies, same-origin/CSRF mutation protection, no-registration login UI, protected layout, and early middleware redirect.
- Authentication RED→GREEN: service test failed on missing module then 6/6 passed; route test failed on missing handler then 4/4 passed; login UI test failed on missing component then passed.
- Prisma-backed sessions now persist only credential digests and support resolution and revocation in the test database.
- Same-origin validation uses the externally visible forwarded/Host authority, preventing false CSRF rejection when Next.js reconstructs an internal request URL.
- Child profile forms normalize calendar dates and nullable numeric fields, while API responses serialize Prisma decimals explicitly.
- Vitest files run sequentially because database integration files share one disposable PostgreSQL schema and each owns cleanup.
- Growth outputs serialize explicit units, calculate BMI only from height plus weight in the same record, and compare each metric only with its previous available value; no percentile or diagnostic output is produced.
- Sleep sessions are attributed to the household-local date containing `endedAt`; net minutes subtract explicit awake time, while absent awake time means none recorded rather than an invented value.
- Activity summaries use the household-local occurrence date. Outdoor minutes are summed independently; only records explicitly marked moderate or vigorous contribute their full duration to the moderate/vigorous total.
- Emotion summaries count recorded observations by household-local date, mood, and tag over 7/30-day windows. They intentionally expose no aggregate score, diagnosis, or inferred condition.
- The Today dashboard distinguishes unknown quantities from recorded zero, attributes records by household-local date, and labels trend notices as summaries of submitted data. Quick actions lead directly to the short forms already used by each domain page.
- Unified history reads every domain by authenticated household, normalizes occurrence time without copying sensitive values into audit output, and sends users to the existing domain form for edits or restoration. Nutrition edit forms now expose the already-tested PATCH APIs.
- Export loads data directly by authenticated household, never exports `AdminSession`, converts decimals and timestamps explicitly, and reduces audit metadata to changed field names. CSV cells are quoted and spreadsheet-formula prefixes are neutralized.
- The service worker caches only the offline fallback, manifest, icons, and immutable Next static assets. Navigations use the network with an offline fallback but are not stored; `/api/` requests bypass service-worker caching entirely.
- The deployment image installs dependencies with a BuildKit cache and optional CA secret, generates Prisma assets in the builder, then copies the verified dependency tree into the runtime image so startup never downloads engines. Compose keeps PostgreSQL and Caddy state in named volumes and routes only through the internal service names.
- Backup and restore scripts operate inside the Compose PostgreSQL container, write a SHA-256 companion file, require a separate target database by default, and compare migration counts as part of the documented recovery procedure.
- `scripts/mvp-smoke.mjs` is an environment-driven release check that exercises the deployed application through its public proxy without embedding credentials. It also asserts security cookie flags, CSRF/origin behavior, API envelope shape, and no-store policy.
- Mobile presentation logic stays in small client components for pathname state, logout, and existing forms; server components, API routes, Prisma schema, audit behavior, household isolation, and service-worker cache policy remain unchanged. Nutrition requests retain their validated schema while the creation/edit UI now exposes previously omitted optional payload fields.
- The child profile detail is view-first: health-domain links and a compact profile summary stay on the default route, while the existing authenticated edit form lives on a dedicated low-frequency route and returns to the detail after success.

## Blockers

- None.

## Next step

- Begin only explicitly deferred P1/P2 work; the next maintenance priority remains the isolated Prisma 7 and Next.js 16 upgrade.
