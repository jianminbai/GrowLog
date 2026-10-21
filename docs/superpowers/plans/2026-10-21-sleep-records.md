# Sleep Records Implementation Plan

**Goal:** Deliver household-scoped night/nap interval CRUD, soft-delete/restore, history, and timezone-aware daily/7/30-day summaries.

**Rules:** Store UTC instants. End must follow start; awake minutes cannot exceed elapsed minutes. Net sleep is elapsed minus awake. Attribute a session to the household-local calendar date containing its end instant so overnight sleep appears on the waking day.

## Tasks

- [x] RED→GREEN interval validation and timezone summaries.
- [x] RED→GREEN scoped PostgreSQL lifecycle and audit.
- [x] RED→GREEN authenticated handlers.
- [x] Add routes and mobile sleep UI.
- [x] Run full verification, smoke, update ledgers, and commit M5.
