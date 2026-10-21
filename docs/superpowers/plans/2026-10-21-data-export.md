# M11 Household Data Export Plan

**Goal:** Provide authenticated, versioned JSON and per-domain CSV downloads for one household with explicit units and safe escaping.

**Architecture:** An export service queries every durable P0 domain by authenticated household, excludes deleted rows by default, omits sessions/credentials, converts decimals and timestamps explicitly, and redacts audit metadata to changed field names. Route handlers return JSON or RFC 4180-style CSV attachments. A protected Settings page provides download links and a deliberate include-deleted option.

## Tasks

1. Add failing tests for household isolation, deleted opt-in, stable JSON versioning, explicit-unit CSV headers, and escaping of commas/quotes/newlines.
2. Implement the export data loader, JSON serializer, and per-domain CSV serializer.
3. Add authenticated JSON/CSV download handlers and routes with validated query parameters.
4. Add protected Settings navigation and download UI.
5. Run database reset, full tests, lint, typecheck, build, and authenticated download smoke.
6. Update durable state files and commit M11.
