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

## Current task

- M6: implement meals, food items, milk/water records, nullable quantities, CRUD/history, and daily totals.

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

## Blockers

- None. The published cloud egress rule now permits Prisma's signed engine download without bypassing integrity checks.

## Next step

- Implement M6 meal/item and beverage validation with offered/consumed/estimated distinctions and nullable amounts.
- Add household-scoped lifecycle APIs, daily totals, and mobile entry/history UI.
