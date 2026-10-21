# GrowLog architecture decisions

## ADR-001 — Modular monolith

Use one Next.js deployment with domain modules and explicit persistence interfaces. This keeps the private-family MVP operationally small while preserving boundaries that can later be extracted.

## ADR-002 — PostgreSQL is the source of truth

All durable application data lives in PostgreSQL through Prisma. Browser storage may cache non-sensitive UI state but never acts as the only persistence layer.

## ADR-003 — Household isolation from the first migration

Every query is scoped to the authenticated administrator’s household. Models carry `householdId` where direct scoping prevents ambiguous joins. This adds small schema repetition and avoids a risky multi-tenant retrofit.

## ADR-004 — Soft deletion plus append-only audit events

Mutable health records use `deletedAt`; create, update, delete, and restore append audit records. Hard deletion is reserved for a separately authorized maintenance operation outside the normal UI.

## ADR-005 — Calendar dates and instants are distinct

Household reporting dates use ISO date strings interpreted in the household IANA time zone. Actual moments use UTC timestamps. Sleep sessions store start/end instants so crossing midnight is unambiguous.

## ADR-006 — Medical claims require versioned evidence

P0 shows measurements and descriptive trends only. Percentiles, Z-scores, age recommendations, and risk rules are enabled only with a named authoritative source, applicable age range, and versioned data set.

## ADR-007 — Native inline execution on branch `work`

The cloud checkout is clean and already uses the non-main `work` branch. Development stays in this checkout so the requested durable project files remain at the repository root. A nested worktree would make the environment snapshot and recovery path less direct.

## ADR-008 — Preserve Prisma artifact verification

The environment currently blocks `binaries.prisma.sh`. Do not set `PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING` or vendor an engine assembled through an internal WASM adapter. Save the required domain in cloud configuration and wait for that rule to be published. Static schema validation may use Prisma's npm-published WASM from the exact engine commit, but it does not replace migration and client verification.

## ADR-009 — Authentication core is persistence-agnostic

Authentication rules depend on a small `SessionRepository` contract. Production uses a lazy Prisma adapter, while unit and route tests use an in-memory implementation. This lets security behavior remain tested without hiding the outstanding real-PostgreSQL integration requirement.

## ADR-010 — Mutation origin follows the externally visible request authority

Validate browser `Origin` against `X-Forwarded-Host`/`X-Forwarded-Proto` when supplied by the deployment proxy, then `Host`, with the request URL as fallback. This preserves same-origin protection when Next.js receives an internal URL behind Caddy or another trusted proxy; the per-session CSRF digest remains required independently.

## ADR-011 — Shared database integration tests run sequentially

Integration test files share one disposable `growlog_test` schema and clean tables before each case. Vitest disables file-level parallelism so independent cleanup hooks cannot delete another test's parent rows mid-transaction. Unit cases remain isolated and the suite is small enough that deterministic execution is the better tradeoff.

## ADR-012 — Outdoor time and exercise intensity remain independent

Each activity stores total duration, optional outdoor minutes, and an explicit intensity. Weekly outdoor totals use only `outdoorMinutes`; moderate/vigorous totals use total duration only when intensity is marked `MODERATE` or `VIGOROUS`. This prevents a light-intensity outdoor session from being presented as effective moderate/vigorous exercise.

## ADR-013 — Emotion trends are descriptive counts

Emotion summaries count submitted observations by mood and tag in household-local 7/30-day windows. They do not calculate a wellness score, infer an unrecorded state, or label a psychological or neurodevelopmental condition. The UI states that frequency depends on what the caregiver recorded.

## ADR-014 — Dashboard absence remains unknown

The Today dashboard reports completion from records assigned to the household-local date. Missing records and unknown beverage quantities remain visibly unknown instead of becoming invented zeros. Trend notices describe submitted 7-day data and state their limits; quick actions reuse the domain forms rather than duplicating mutation logic.
