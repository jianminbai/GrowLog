# GrowLog engineering guide

## Product boundary

GrowLog is a private, single-household child health journal. The MVP records and retrieves family-entered observations; it does not diagnose disease, predict adult height, invent nutrition values, or claim causality from correlated trends.

## Architecture

- Next.js App Router and TypeScript form a modular monolith.
- Route Handlers expose authenticated JSON endpoints under `/api`.
- Domain modules live under `src/modules/<domain>` and own validation, use cases, and persistence contracts.
- Prisma is the production persistence adapter for PostgreSQL. Every household-owned row is scoped by `householdId` directly or through its child.
- UI pages are mobile first and use server rendering where useful; client components are limited to interactive forms and charts.
- All mutable health records support soft deletion and create an `AuditLog` entry for create, update, delete, and restore operations.

## Development rules

- Read `AGENTS.md`, `TASKS.md`, `PROGRESS.md`, and `DECISIONS.md` before work.
- Select the highest-priority unchecked task whose dependencies are complete.
- Use strict TypeScript, Zod validation at request boundaries, and explicit units in names and schemas.
- Treat absence as `null`/missing data, never as numeric zero.
- Store instants in UTC and household dates as ISO `YYYY-MM-DD`; retain the household IANA time zone.
- Never log secrets, session tokens, child health payloads, or uploaded documents.
- Add a failing behavioral test before production code, then make it pass and run the relevant suite.
- Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` before marking a milestone complete.
- Update `TASKS.md`, `PROGRESS.md`, and `DECISIONS.md` when task state or architecture changes.
- Commit each verified task with a conventional commit message.

## Working environment

Each cloud task already runs in an isolated environment. Use the existing checkout; do not create a Git worktree unless the user explicitly requests one.

## Safety and scope

- No public registration. Authentication is for the configured administrator only.
- Medical reference calculations require a named, versioned, checked-in authoritative data set and are outside P0 until that data is supplied and verified.
- AI-extracted content is never saved as confirmed health data without human review.
- Stop only for destructive or irreversible operations, real credentials, paid services, or a material conflict in product requirements.
