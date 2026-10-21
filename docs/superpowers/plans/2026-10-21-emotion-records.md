# M8 Emotion Records Implementation Plan

**Goal:** Deliver quick, household-scoped emotion observations with descriptive trend counts and explicitly non-diagnostic presentation.

**Architecture:** The emotion module validates a bounded overall mood plus optional normalized tags, context, duration, peer/parent interaction, notes, occurrence time, and source. Prisma persistence uses household-scoped lifecycle operations with redacted audit metadata. Authenticated handlers provide CRUD, restore, and household-timezone 7/30-day frequency summaries. The protected mobile page supports quick entry and history editing without diagnostic scores or claims.

## Tasks

1. Add failing domain tests for normalization, bounds, and timezone-aware mood/tag counts.
2. Implement emotion schemas and descriptive summaries.
3. Add failing PostgreSQL lifecycle, ownership, and audit tests; implement the repository.
4. Add failing authenticated handler tests; implement handlers and runtime wiring.
5. Add API routes and mobile entry/history UI linked from the child profile.
6. Run database reset, focused tests, lint, typecheck, full tests, production build, and HTTP smoke.
7. Update durable state files and commit M8.
