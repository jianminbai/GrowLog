# M7 Physical Activity Implementation Plan

**Goal:** Deliver household-scoped physical and outdoor activity recording with lifecycle management and weekly summaries.

**Architecture:** The activity module validates total duration, outdoor duration, intensity, structure, source/context, and optional participation notes. A Prisma repository owns household-scoped persistence and audit events. Authenticated route handlers expose CRUD, restore, and a timezone-aware weekly summary. A protected mobile page supports quick entry and history management.

## Tasks

1. Add failing domain tests for validation and summaries, including the distinction between outdoor time and moderate/vigorous activity.
2. Implement domain schemas and timezone-aware weekly aggregation.
3. Add failing database integration coverage for ownership, CRUD, soft delete, restore, and redacted audit metadata.
4. Implement the activity repository and authenticated handlers, then cover handler validation/auth behavior.
5. Add API routes and a protected mobile entry/history page linked from the child profile.
6. Run database reset, focused tests, lint, typecheck, full tests, build, and an HTTP smoke test.
7. Update `TASKS.md`, `PROGRESS.md`, and `DECISIONS.md`, then commit M7.
