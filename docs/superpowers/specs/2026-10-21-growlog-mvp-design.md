# GrowLog MVP design

## Intent and success

GrowLog is a private PWA for one family to record a child’s growth and daily health observations with low effort and reliable history. A successful MVP protects all data behind one administrator login, persists it in PostgreSQL, supports corrections and recovery, presents useful descriptive trends without medical overclaiming, and can be deployed and backed up on a Linux VPS.

The supplied product brief is the source of product intent. The autonomous-development instruction selects native inline execution and permits reasonable defaults. P1 medical-reference and AI extraction features remain outside the MVP because trustworthy reference data and an external AI/privacy decision are separate deliverables.

## Product surface

The primary navigation has Today, History, Growth, Child, and Settings. Today is the mobile home and shows completion cards plus quick actions for sleep, meal/beverage, activity, mood, and growth. History groups records by date with edit, soft-delete, and restore actions. Growth displays height, weight, and BMI series without invented percentiles. Settings holds export, backup guidance, session controls, and audit history.

Common input paths use short forms with sensible defaults and explicit units. Unknown values remain blank. User-facing health text describes observations and data completeness, never diagnoses conditions or asserts that one behavior caused another.

## System architecture

The application is a modular monolith:

1. Next.js App Router renders protected pages and public login/offline pages.
2. Route Handlers parse JSON, verify the session and CSRF token, validate with Zod, invoke a domain use case, and serialize a consistent result or error.
3. Domain modules own rules for children, growth, sleep, nutrition, activity, emotion, dashboards, audits, and exports.
4. Repository interfaces isolate use cases from Prisma. Prisma adapters scope every operation to the session household.
5. PostgreSQL stores application data; a private volume stores database state. No health record depends on browser storage.

Responses use `{ "data": ... }` on success and `{ "error": { "code", "message", "fields"? } }` on failure. Expected statuses are 400 malformed input, 401 missing/expired session, 403 invalid CSRF or wrong household, 404 absent/soft-deleted record, 409 conflict, and 500 with a non-sensitive message.

## Authentication and security

The instance is bootstrapped from `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, and `SESSION_SECRET`; it exposes no signup endpoint. Login verifies the configured Argon2id hash and creates a random, hashed, expiring database session. The browser receives a `Secure`, `HttpOnly`, `SameSite=Lax` cookie. Mutations also require a session-bound CSRF token. Middleware provides an early redirect while server-side guards remain authoritative.

Security headers, request-size limits, structured redacted logs, upload type/size checks, and generic authentication errors reduce common exposure. Exports, audits, and health routes are authenticated. Service workers cache only static assets and an offline shell, never authenticated API responses.

## Data model

`Household` owns `Child`, `AdminSession`, and `AuditLog`. A child owns `GrowthMeasurement`, `SleepSession`, `Meal`, `BeverageIntake`, `PhysicalActivity`, and `EmotionRecord`. `Meal` owns `MealItem`. Each mutable record has an ID, household/child scope, created/updated timestamps, source, optional notes, and `deletedAt`.

Measurements use metric units (`heightCm`, `weightKg`, `headCircumferenceCm`, `volumeMl`, integer minutes) and decimal database types where rounding matters. Sleep stores UTC start/end timestamps plus optional awake minutes. Nutrition distinguishes offered, consumed, and estimated quantities with nullable amounts and units. Activity records total duration, outdoor minutes, intensity, and structure independently. Emotion uses a bounded overall mood enum and optional tags/context rather than a diagnostic score.

Indexes begin with `householdId` and common filters such as child/date/deleted state. Unique constraints prevent duplicate bootstrap households and provide safe identifiers. The first migration is checked in and deploys through `prisma migrate deploy`.

## Audit and data lifecycle

Create, update, delete, and restore are transactions that append an `AuditLog`. Audit metadata stores changed field names and safe values where appropriate; it excludes password/session material. Normal deletes set `deletedAt`. Restores preserve record identity. Exports are versioned and default to active records.

## Dates and summaries

An IANA time zone belongs to the household. Daily queries convert local day boundaries to UTC. Sleep duration is `end - start - awakeMinutes`, supports crossing midnight, and rejects non-positive or implausibly long intervals. Dashboard totals are simple sums of entered values; missing data is reported as missing rather than zero. Trend windows are 7 and 30 days for the MVP.

## Deployment and recovery

Docker Compose runs app, PostgreSQL, and Caddy. Only Caddy publishes HTTP/HTTPS ports. Named volumes retain PostgreSQL and Caddy state. The app exposes a health endpoint that checks database connectivity. Backup uses `pg_dump` in custom format; restore targets an explicitly named database, runs migrations, and verifies row counts/health before traffic resumes.

## Testing strategy

- Domain tests cover validation, time math, scope, soft deletion, and summary calculations.
- Route tests cover authentication, CSRF, schemas, and the common error envelope.
- PostgreSQL integration tests cover migrations, constraints, transactions, isolation, and audit creation.
- UI tests cover mobile rendering and form behavior; one browser flow covers login and the core create/query/edit/delete/restore journey.
- Release checks are lint, strict typecheck, all tests, production build, Compose config, and backup/restore smoke verification.

## MVP acceptance

The MVP is complete only when M0–M14 in `TASKS.md` are checked with recorded evidence in `PROGRESS.md`. Generated code, static screens, mocked persistence, or unexecuted tests do not count. `npm run build` and the configured automated tests must pass in the current revision.

## Delivery sequence

Implement a thin foundation first, then vertical domain slices: foundation/authentication; household/child/audit persistence; growth; sleep; nutrition; activity; emotion; dashboard/history; export/PWA; deployment/recovery; end-to-end validation. This order exposes security and data-model mistakes early and leaves each slice independently testable.
