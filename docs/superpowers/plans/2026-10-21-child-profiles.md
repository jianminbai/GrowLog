# Child Profiles Implementation Plan

**Goal:** Deliver authenticated, household-scoped child profile create, list, view, and edit flows with validation, audit records, and a mobile-first interface.

**Architecture:** A child profile module owns Zod request schemas and serialization. Prisma repository functions enforce household scope and append redacted audit events in the same transaction as mutations. Route handlers receive authenticated session context before calling the module. Protected server pages render stored profiles while a client form handles create and edit submissions with the per-session CSRF token.

## Verification focus

- Calendar birth dates reject impossible and future dates without time-zone drift.
- Optional measurements remain null when absent and accept only plausible positive values.
- Reads and updates include both child ID and authenticated household ID.
- Create and update mutations append audit events containing field names, never health values.
- Anonymous and cross-household requests do not expose profile data.

## Tasks

- [x] Add RED tests for child input validation.
- [x] Implement child schemas and JSON serialization.
- [x] Add RED database tests for full profile persistence, scoped update, and audit metadata.
- [x] Implement list/create/find/update repository behavior.
- [x] Add RED handler tests for authentication, CSRF, validation, and not-found behavior.
- [x] Implement authenticated API routes.
- [x] Implement protected profile list and create/edit mobile UI.
- [x] Run database reset, lint, typecheck, all tests, production build, and HTTP smoke.
- [x] Update durable ledgers and commit M3.
