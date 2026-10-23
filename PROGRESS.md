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
- M20 focused mobile refinement: Today is a same-day dashboard, growth records use a compact essential-column table with expandable measurement context, and Settings uses grouped low-frequency management menus.
- M21 comparison and navigation refinement: Today shows preceding-seven-day recorded-day baselines, growth uses date-only measurement labels, navigation is named “今天/足迹/趋势/设置”, nutrition history uses consistent expandable cards, and semantic green/orange/red roles replace ambiguous neutral red accents.
- M22 compact longitudinal review: Footprints is now a read-only compact timeline without time-of-day or swipe editing, growth dates stay on one line, and Today compares compact values across today plus preceding 7/14/30-day windows while preserving unknown values.
- M23 copy and table-density refinement: Today and Trends use task-focused header copy, report-level instructional notes are removed, and growth measurements align in compact centered rows while preserving the details touch target.
- M24 modern minimalist visual refresh: the full public and authenticated application now uses a neutral surface hierarchy, violet brand actions, semantic status colors, shared line icons, consistent mobile forms and tables, and explicit light/dark theme pairs without changing routes, APIs, persistence, or business rules.
- Repository documentation: the root README provides an accurate Chinese product overview, Docker/VPS quick start, development checks, backup/restore entry points, security boundaries, and links to durable project records.

## Current task

- All GrowLog MVP milestones M0–M24 are implemented and verified. Deferred P1/P2 work remains listed in `TASKS.md`.

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
- M17 RED→GREEN: history-page tests require household-local date groups and a deliberate right-swipe edit reveal; settings and data-management tests require a low-frequency entry, deleted-only recovery, redacted audits, and a CSRF-protected restore request; CSS and placement contracts keep cards compact and deleted data out of daily domain pages (2026-10-22).
- M17 review fixes: link-originated pointer and keyboard events no longer close or suppress the revealed edit link, canceled gestures restore the prior card state, and cross-year date headings include the year; 5 focused regression tests pass (2026-10-22).
- M17 final gate: clean test-database reset, lint with zero warnings, typecheck, 129/129 tests across 45 files with PostgreSQL enabled, and the production build including `/settings/data-management` all pass (2026-10-22).
- M18 RED→GREEN: child-list, child-detail, time-series, daily-total, report, settings-navigation, and legacy-edit tests first failed against the prior embedded forms, then 24/24 focused assertions passed after the view/management split (2026-10-22).
- M18 review fixes: all meal/beverage/activity enum values have readable labels, yogurt drinks receive their own chart, unknown daily quantities stay unknown, inherited editor-route keys return 404, and every report remains household scoped (2026-10-22).
- M18 final gate: clean test-database reset, lint with zero warnings, typecheck, 151/151 tests across 50 files with PostgreSQL enabled, and the production build including all report and settings-management routes pass (2026-10-22).
- M18 browser verification: authenticated seeded pages at 320, 390, and 768 px produced 34 successful page checks; five reports contained chart/table output without forms, five settings editors retained forms, Today and swipe-revealed History links reached those editors, and no page-level horizontal overflow was detected (2026-10-22).
- M19 RED→GREEN: pointer/keyboard chart interaction, annualized height-growth edge cases, report-table output, and History overview/category/affordance assertions first failed against the static presentation, then 41 focused assertions across 5 files passed (2026-10-22).
- M19 browser verification: authenticated growth and History pages at 320, 390, and 768 px have no page-level horizontal overflow; focusing a height point exposes its household-local timestamp and exact value, annualized growth is populated, History shows its overview and category timeline, and keyboard intent reveals the settings editor link (2026-10-22).
- M19 review fixes: normalized SVG path lengths keep long lines complete and reduced-motion lines visible; dense point hit testing delegates to a two-dimensional nearest-point calculation while keyboard controls remain available; History swipe hints use theme-safe contrast; long card content wraps instead of being clipped; native SVG titles render as one text node (2026-10-22).
- M19 final gate: clean test-database reset, lint with zero warnings, typecheck, 157/157 tests across 50 files with PostgreSQL enabled, and the production build including the interactive report and refined History routes pass (2026-10-22).
- M20 RED→GREEN: Today-only dashboard content/query assertions, growth-table column/detail assertions, grouped Settings navigation, and responsive CSS contracts first failed against the previous presentation, then 28 focused assertions across 5 files passed (2026-10-22).
- M20 review fixes: milk and water totals now remain independently unknown until that drink type has an explicit volume; missing or partial outdoor duration remains visible instead of becoming a fabricated zero; the new regression cases first failed and then 5/5 focused tests passed; independent re-review found no remaining Critical or Important issues (2026-10-22).
- M20 final gate: clean test-database reset, lint with zero warnings, typecheck, 161/161 tests across 51 files with PostgreSQL enabled, and the production build including Today, profile reports, and Settings routes pass (2026-10-22).
- M20 browser verification: authenticated production pages at 320, 390, and 768 px produced 9 successful page checks; Today contains completion, five same-day overview items, and five quick actions without latest blocks; growth uses the requested column order and expandable details; Settings exposes three grouped menu sections; no page-level horizontal overflow was detected (2026-10-22).
- M21 RED→GREEN: seven-day recorded-day comparisons, date-only growth output, navigation/history copy, expandable nutrition cards, and semantic palette contracts first failed against the previous behavior; 47 focused assertions across 8 files then passed (2026-10-23).
- M21 review fixes: current-day milk, water, and outdoor totals now remain unknown when any same-metric record omits its value instead of publishing a partial total; regression tests first failed and then passed; neutral rose/emotion accents now use orange; strict TypeScript narrowing was corrected; independent review found no remaining Critical issue (2026-10-23).
- M21 final gate: clean test-database reset, lint with zero warnings, strict typecheck, 166/166 tests across 51 files with PostgreSQL enabled, and the production build all pass (2026-10-23).
- M21 browser verification: authenticated production pages at 320, 390, and 768 px passed all checks for five Today comparisons with recorded-day samples, date-only growth table/chart labels, “今天/足迹/趋势/设置” navigation, the “成长足迹” heading, two localized expandable nutrition-history cards with paired save/delete actions, and no page-level horizontal overflow (2026-10-23).
- M22 RED→GREEN: Footprints presentation, growth date wrapping, 7/14/30-day aggregation, compact Today markup, and responsive CSS contracts produced 9 expected failures against the previous UI, then 36 focused assertions across 5 files passed (2026-10-23).
- M22 review fixes: beverage-only days keep meal and food-item counts unknown instead of displaying `0餐/0项`; activities without an outdoor duration show `户外未记录` instead of a fabricated zero. The regression tests failed before the fixes and then passed; independent re-review found no remaining Critical or Important issue (2026-10-23).
- M22 final gate: clean test-database reset, lint with zero warnings, strict typecheck, 168/168 tests across 51 files with PostgreSQL enabled, and the production build all pass (2026-10-23).
- M22 browser verification: authenticated production pages at 320, 390, and 768 px show five 72px Today comparison rows with four periods each, Footprints rows no taller than 51px without time/swipe/edit UI, and three single-line growth dates; all checked pages avoid horizontal overflow. The seeded boundary case also verifies that beverage-only nutrition leaves meals unknown and missing outdoor duration remains explicitly unknown (2026-10-23).
- M23 RED→GREEN: task-focused header copy, removal of redundant instructional notes, growth-table class assignment, and compact centered measurement CSS produced 4 expected failures, then 32 focused assertions across 4 files passed (2026-10-23).
- M23 review: independent review found no remaining Critical or Important issue; the scoped measurement style preserves the 44px details target and lets expanded detail text wrap normally (2026-10-23).
- M23 final gate: clean test-database reset, lint with zero warnings, strict typecheck, 169/169 tests across 51 files with PostgreSQL enabled, and the production build all pass (2026-10-23).
- M23 browser verification: authenticated production pages at 320, 390, and 768 px show the revised Today/Trends copy, omit both requested instructions, keep all growth measurement rows at 53px with a 44px details target, center every cell vertically and horizontally without wrapping, and avoid page-level horizontal overflow (2026-10-23).
- M24 RED→GREEN: visual-token, semantic-pair, shell, navigation, card, chart, settings, and editor CSS contracts plus shared SVG-icon component tests failed against the previous presentation, then passed after the visual refresh; a screenshot review found and locked down the dark-mode snapshot-label contrast fix (2026-10-23).
- M24 review: independent review found no Critical issue and three Important contrast gaps; solid login focus rings, fully opaque small status labels, and a darker light-theme muted token fixed all three, with tests calculating contrast against every neutral surface. Browser verification then exposed nested Settings current-state and closed-disclosure geometry defects, both fixed with focused regressions (2026-10-23).
- M24 final gate: a clean test-database reset and migration, 179/179 tests across 52 files with PostgreSQL enabled, lint with zero warnings, strict typecheck, production build, and diff checks all pass (2026-10-23).
- M24 browser matrix: 164 checks across public and authenticated production pages, all five read-only reports, profile management, recovery, expanded Settings export menus, and all five expanded record editors passed at 320×568, 390×844, 430×932, and 768×1024 in light and dark themes; there was no page overflow, sub-16px input text, navigation breakpoint/current-state error, or fixed-navigation overlap, and 16 representative screenshots were visually reviewed (2026-10-23).

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
- The Today dashboard attributes records by household-local date and shows completion, same-day sleep/nutrition/activity/emotion values, and direct quick-entry actions. It does not query growth history or present latest/trend blocks; optional milk, water, and outdoor quantities remain independently unknown and partial values are identified.
- Unified history reads every domain by authenticated household, normalizes occurrence time without copying sensitive values into audit output, and sends users to the existing domain form for edits or restoration. Nutrition edit forms now expose the already-tested PATCH APIs.
- Export loads data directly by authenticated household, never exports `AdminSession`, converts decimals and timestamps explicitly, and reduces audit metadata to changed field names. CSV cells are quoted and spreadsheet-formula prefixes are neutralized.
- The service worker caches only the offline fallback, manifest, icons, and immutable Next static assets. Navigations use the network with an offline fallback but are not stored; `/api/` requests bypass service-worker caching entirely.
- The deployment image installs dependencies with a BuildKit cache and optional CA secret, generates Prisma assets in the builder, then copies the verified dependency tree into the runtime image so startup never downloads engines. Compose keeps PostgreSQL and Caddy state in named volumes and routes only through the internal service names.
- Backup and restore scripts operate inside the Compose PostgreSQL container, write a SHA-256 companion file, require a separate target database by default, and compare migration counts as part of the documented recovery procedure.
- `scripts/mvp-smoke.mjs` is an environment-driven release check that exercises the deployed application through its public proxy without embedding credentials. It also asserts security cookie flags, CSRF/origin behavior, API envelope shape, and no-store policy.
- Mobile presentation logic stays in small client components for pathname state, logout, and existing forms; server components, API routes, Prisma schema, audit behavior, household isolation, and service-worker cache policy remain unchanged. Nutrition requests retain their validated schema while the creation/edit UI now exposes previously omitted optional payload fields.
- The child area is view-first: the list offers creation only when empty, child detail contains five report categories, and each category displays time-based charts plus complete read-only tables. Child creation, profile editing, and all record editors live under Settings; Today, History, and the legacy profile-edit route point to those management routes.
- The active history timeline is grouped by household-local day and uses compact rows that retain category, child, title, and detail without time-of-day or inline editing. Record maintenance, deleted records, and redacted audits live under Settings, where restore actions reuse the existing household-scoped APIs and CSRF contract.
- Profile charts now use native SVG plus accessible HTML point controls to expose exact household-local timestamps and values through pointer, touch, and keyboard input. Growth reports add retrospective annualized height change between consecutive valid measurements, while History adds a compact summary and category-marked visual timeline without removing any record detail or edit path.
- Growth tables prioritize measurement time, height, annualized height growth, weight, BMI, changes, and source; lower-frequency measurement conditions and notes remain available through a native disclosure. Settings groups children/records, data/backup, and account controls into compact touch-safe menus without changing the existing APIs or authorization boundary.
- Today baselines divide each metric only by dates with complete values; the snapshot retains sample-day counts for verification while the compact UI presents only the resulting values, and today stays a partial-day snapshot. Growth alone uses date-only labels, while domains where time of day matters retain their timestamps. Navigation and nutrition-history presentation now share the same mobile information hierarchy and semantic color system.
- Today now repeats that baseline policy for the preceding 7, 14, and 30 household-local dates and presents the results in four compact columns alongside today. Footprints keeps daily grouping and complete summaries but removes time-of-day plus direct editing interactions; record maintenance remains available in Settings. Growth measurement dates use a dedicated no-wrap element inside the horizontally scrollable report table.
- Today and Trends headers now state the current task directly. Trend reports rely on chart/table labels and accessible point controls instead of repeating timezone, management, and pointer instructions. The growth measurement table uses a scoped centered-row style with reduced cell padding while its details summary remains touch sized.
- The visual system now separates violet brand actions from green success, orange warning, and red danger states; shared stroke-based SVG icons replace mixed glyphs in primary navigation, report entry points, and Settings. Neutral canvas/surface tokens, 1.5rem panels, muted inputs, consistent focus rings, and compact mobile tables/forms apply across public and authenticated routes in both color schemes.
- Primary navigation treats every nested Settings route as part of Settings. Closed export disclosures explicitly remove submenu geometry, while opened disclosures remain within the protected shell's bottom safe space so fixed mobile navigation cannot cover their final action.

## Blockers

- None.

## Next step

- Begin only explicitly deferred P1/P2 work; the next maintenance priority remains the isolated Prisma 7 and Next.js 16 upgrade.
