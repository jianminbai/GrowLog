# Growth Measurements and Trends Implementation Plan

**Goal:** Deliver household-scoped growth measurement entry, history, edit, soft-delete, restore, descriptive calculations, and a mobile trend chart.

**Architecture:** The growth module validates explicit centimeter/kilogram fields and ISO instants. Prisma transactions pair every mutation with redacted audit metadata. Authenticated handlers scope by both household and child. Serialization computes BMI and prior-value differences without medical percentiles or interpretation.

## Tasks

- [x] RED→GREEN growth validation, BMI, and change calculations.
- [x] RED→GREEN PostgreSQL create/list/update/delete/restore with household isolation and audit.
- [x] RED→GREEN authenticated handlers and request validation.
- [x] Add API routes and mobile entry/history/chart pages.
- [x] Run migration reset, lint, typecheck, all tests, build, and HTTP smoke.
- [x] Update ledgers and commit M4.
