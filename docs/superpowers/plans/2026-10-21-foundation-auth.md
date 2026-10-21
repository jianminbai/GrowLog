# Foundation and Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a buildable GrowLog shell with tested PostgreSQL persistence, household isolation, auditing, and secure single-administrator sessions.

**Architecture:** A Next.js 15 modular monolith exposes small domain services behind App Router pages and Route Handlers. Prisma 6 adapts those services to PostgreSQL. Authentication stores only a SHA-256 digest of each random session token and isolates all later records by `householdId`.

**Tech Stack:** Next.js 15.5.28, React 19.2.8, TypeScript 5, Tailwind CSS 4, Prisma 6.19.2, PostgreSQL 16, Zod 4, `@node-rs/argon2` 2.2.2, Vitest 5.

**Spec:** `docs/superpowers/specs/2026-10-21-growlog-mvp-design.md`

## Global Constraints

- No public registration endpoint or page.
- All durable application data uses PostgreSQL; no browser-only source of truth.
- Secrets come from environment variables and never appear in logs or committed files.
- Health and identity data is household scoped.
- New behavior follows a witnessed RED→GREEN test cycle.
- The saved cloud startup guidance must use the existing checkout and must not create a worktree unless the user explicitly asks.

## Review Focus

- Authentication responses must not reveal whether an email or password was wrong; Task 3 tests identical failures.
- Session tokens must never be stored raw; Task 3 tests that repository input is a digest rather than the issued token.
- Expired and revoked sessions must fail closed; Task 3 tests both states.
- Mutating authenticated requests without a matching CSRF token must return 403; Task 3 route tests cover it.
- A repository request for another household’s entity must return no result; Task 2 integration tests cover isolation.

---

### Task 1: Executable application baseline

**Files:**
- Create: `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `vitest.config.ts`, `.gitignore`, `.env.example`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/app/api/health/route.ts`
- Create: `src/lib/result.ts`, `src/lib/result.test.ts`
- Modify: `TASKS.md`, `PROGRESS.md`

**Interfaces:**
- Consumes: the design’s consistent success/error envelope.
- Produces: `ok<T>(data: T): Success<T>`, `problem(code, message, status, fields?): Failure`, and the project verification commands.

- [ ] **Step 1: Add configuration and a failing result-envelope test**

Create the configuration files, a minimal test that asserts `ok({ready:true})` and a 400 `problem("VALIDATION_ERROR", ...)` shape, and no production helper yet.

- [ ] **Step 2: Verify RED**

Run: `npm_config_cache=/tmp/growlog-npm-cache npm install && npm test -- src/lib/result.test.ts`
Expected: dependencies install with lockfile, then FAIL because `src/lib/result.ts` is missing.

- [ ] **Step 3: Implement the result helper and minimal app shell**

Add the generic envelope helper, accessible warm mobile-first landing shell, global styles, and `/api/health` returning the envelope without exposing configuration.

- [ ] **Step 4: Verify GREEN and baseline quality**

Run: `npm test -- src/lib/result.test.ts && npm run lint && npm run typecheck && npm run build`
Expected: one test passes and every command exits 0.

- [ ] **Step 5: Update ledgers and commit**

Mark M0 verified with exact command results in `PROGRESS.md` and commit `feat: establish GrowLog application baseline`.

### Task 2: PostgreSQL schema, migration, and scoped persistence

**Files:**
- Create: `prisma/schema.prisma`, `prisma/migrations/20261021000000_initial/migration.sql`, `prisma/migrations/migration_lock.toml`
- Create: `src/lib/db.ts`, `src/modules/audit/audit.ts`, `src/modules/children/child-repository.ts`
- Create: `tests/integration/database.test.ts`, `docker-compose.test.yml`
- Modify: `package.json`, `.env.example`, `TASKS.md`, `PROGRESS.md`, `DECISIONS.md`

**Interfaces:**
- Consumes: PostgreSQL `DATABASE_URL`; envelope utilities from Task 1 only at later route boundaries.
- Produces: Prisma models for `Household`, `Child`, all P0 record types, `AuditLog`, `AdminSession`; `createChildWithAudit`, `findChildForHousehold`; singleton `prisma`.

- [ ] **Step 1: Write the initial schema and failing database integration test**

The test starts from an applied migration and asserts required constraints, a child/audit transaction, and inability to fetch that child with another household ID. Repository functions are imported but absent.

- [ ] **Step 2: Verify RED**

Run: `docker compose -f docker-compose.test.yml up -d --wait && npm run db:test:prepare && npm test -- tests/integration/database.test.ts`
Expected: database and migration start, then FAIL because child repository functions are missing.

- [ ] **Step 3: Implement scoped repository and audit transaction**

Implement `createChildWithAudit(input, actorId)` and `findChildForHousehold(householdId, childId)` with explicit household filters and one Prisma transaction.

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- tests/integration/database.test.ts && npm run prisma:validate && npm run typecheck`
Expected: integration tests and checks pass.

- [ ] **Step 5: Update ledgers and commit**

Mark M1 verified with migration and test evidence; commit `feat: add household-scoped PostgreSQL foundation`.

### Task 3: Single-administrator session authentication

**Files:**
- Create: `src/modules/auth/auth-service.ts`, `src/modules/auth/auth-service.test.ts`, `src/modules/auth/session-repository.ts`, `src/modules/auth/session-cookie.ts`, `src/modules/auth/request-auth.ts`
- Create: `src/app/login/page.tsx`, `src/app/login/login-form.tsx`, `src/app/api/auth/login/route.ts`, `src/app/api/auth/logout/route.ts`, `src/app/api/auth/session/route.ts`
- Create: `src/app/(protected)/layout.tsx`, `src/app/(protected)/today/page.tsx`, `src/app/api/auth/auth-routes.test.ts`, `src/middleware.ts`
- Modify: `.env.example`, `TASKS.md`, `PROGRESS.md`

**Interfaces:**
- Consumes: Prisma `AdminSession` and `Household`; `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`; Task 1 envelopes.
- Produces: `authenticateAdmin(credentials, dependencies)`, `issueSession`, `resolveSession`, `revokeSession`, `requireRequestAuth(request)`, and protected page/API behavior for later modules.

- [ ] **Step 1: Write failing auth service tests**

Cover valid credentials, identical invalid-email/password failures, raw-token non-persistence, expiry, revocation, and CSRF token binding. Use in-memory repository fakes at the domain boundary.

- [ ] **Step 2: Verify RED**

Run: `npm test -- src/modules/auth/auth-service.test.ts`
Expected: FAIL because authentication functions are missing.

- [ ] **Step 3: Implement minimal auth service and persistence adapter**

Use Argon2id verification, `crypto.randomBytes(32)`, SHA-256 token digests, 30-day expiry, database-backed revocation, constant generic failures, and an HttpOnly/Secure/SameSite cookie.

- [ ] **Step 4: Verify service GREEN**

Run: `npm test -- src/modules/auth/auth-service.test.ts`
Expected: all service tests pass.

- [ ] **Step 5: Write failing route tests**

Cover login validation, cookie issuance, anonymous protected access, session status, mutation without CSRF, and logout revocation.

- [ ] **Step 6: Verify route RED**

Run: `npm test -- src/app/api/auth/auth-routes.test.ts`
Expected: FAIL because routes/request guards are missing or incomplete.

- [ ] **Step 7: Implement login UI, routes, request guard, and protected shell**

Use Zod at the JSON boundary, origin/CSRF checks for mutations, server redirects for protected pages, and middleware as an early cookie-presence check only.

- [ ] **Step 8: Verify Task 3 and full foundation**

Run: `npm run lint && npm run typecheck && npm test && npm run build`
Expected: all tests and commands exit 0 with no warnings.

- [ ] **Step 9: Update ledgers and commit**

Mark M2 verified and record tests; commit `feat: protect GrowLog with administrator sessions`.

## Final verification

Run the production build, full tests, and a local authenticated smoke request against the test PostgreSQL instance. Review the full change against the five focus risks above. Update `PROGRESS.md` with any rulings, limitations, and the next ready task (M3).
