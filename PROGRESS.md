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

## Current task

- M1: implement the PostgreSQL/Prisma persistence schema, migration, household isolation, and transactional audit creation.

## Test record

- `npm test -- src/lib/result.test.ts`: 2 passed, 0 failed (2026-10-21).
- `npm run lint`: passed with zero warnings (2026-10-21).
- `npm run typecheck`: passed (2026-10-21).
- `npm run build`: passed; `/`, `/_not-found`, and `/api/health` were emitted (2026-10-21).

## Work implemented but awaiting database verification

- M1 schema: all P0 PostgreSQL/Prisma entities, household scoping, timestamps, sources, soft deletion, indexes, sessions, and audit events are defined in `prisma/schema.prisma`.
- The schema passed the official Prisma schema WASM validator built from the same engine commit as Prisma 6.19.2.
- PostgreSQL 16 test Compose configuration starts and reaches healthy state on port 55432.
- The child repository and integration tests specify transactional child/audit creation and cross-household isolation.
- M2 authentication domain: generic credential failures, Argon2id adapter, random session/CSRF credentials, SHA-256 digest storage, 30-day expiry, revocation, and constant-time CSRF comparison.
- M2 HTTP/UI boundary: validated login/logout/session handlers, secure cookies, same-origin/CSRF mutation protection, no-registration login UI, protected layout, and early middleware redirect.
- Authentication RED→GREEN: service test failed on missing module then 6/6 passed; route test failed on missing handler then 4/4 passed; login UI test failed on missing component then passed.
- Current non-database verification: 13 passed, 2 database integration tests explicitly skipped; lint, strict typecheck, and production build pass.

## Blockers

- Prisma 6.19.2 requires signed engine artifacts and checksums from `binaries.prisma.sh`. The current egress proxy returns HTTP 403, including with a turn-level network grant and an escalated command.
- A cloud environment draft now allows `binaries.prisma.sh`, but that draft must be reviewed, saved, and published before the running environment receives the rule. Integrity checks were not disabled.
- Until then, Prisma Client generation, migration creation/application, and the 2 PostgreSQL integration tests remain unverified; M1 and M2 must stay in progress.

## Next step

- After publishing the environment draft, run `npm ci`, `npx prisma format`, `npx prisma migrate dev --name initial`, then `DATABASE_URL=postgresql://growlog_test:growlog_test@localhost:55432/growlog_test npm test -- tests/integration/database.test.ts`.
- Fix any generated-type differences, rerun lint/typecheck/all tests/build, then complete M1 and M2 before selecting M3.
