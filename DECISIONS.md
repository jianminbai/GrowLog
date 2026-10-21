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
