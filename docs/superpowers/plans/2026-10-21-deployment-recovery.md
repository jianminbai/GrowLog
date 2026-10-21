# M13 Deployment and Recovery Plan

**Goal:** Deliver a reproducible production stack with Caddy, the Next.js app, PostgreSQL persistence, database-aware health checks, and tested backup/restore procedures.

**Architecture:** A multi-stage Node image installs locked dependencies, generates Prisma Client, builds Next, runs migrations and idempotent household bootstrap at startup, then serves on an internal port. Compose connects it to PostgreSQL 16 with a named volume and Caddy with automatic HTTPS support. Health checks require both HTTP and a live database query. Backup/restore scripts execute PostgreSQL custom-format dumps through the Compose database service and restore only to an explicitly named database.

## Tasks

1. Add failing health-handler tests for database success/failure.
2. Implement database-aware health responses without leaking error detail.
3. Add Dockerfile, ignore rules, production Compose, Caddy configuration, and household bootstrap.
4. Add timestamped backup and named-target restore scripts plus deployment/recovery documentation.
5. Validate Compose configuration and image build; start the stack on local test ports and smoke Caddy/health.
6. Create a test backup, restore it to a temporary named database, and verify data.
7. Run full quality gates, update durable state, and commit M13.
