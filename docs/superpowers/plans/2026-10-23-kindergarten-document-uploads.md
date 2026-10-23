# Kindergarten Document Uploads Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add authenticated, child-scoped daily care-sheet and weekly-menu image upload, replacement, viewing, deletion, and VPS-volume backup support under Settings.

**Architecture:** A new `kindergarten-documents` domain owns strict calendar normalization, bounded multipart parsing, magic-byte image validation, local atomic file storage, Prisma metadata/audit transactions, and authenticated handlers. PostgreSQL keeps household-scoped metadata while a Docker named volume keeps random-key image files; the Settings client calls no-store APIs and uses an authenticated image route for cards and a dialog viewer.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript 5, Zod 4, Prisma 6/PostgreSQL 16, Node `fs/promises`, Vitest/Testing Library, Docker Compose.

**Spec:** `docs/superpowers/specs/2026-10-23-kindergarten-document-uploads-design.md`

## Global Constraints

- Associate every document with an active child and the authenticated household; deleted or cross-household children are indistinguishable from missing.
- `DAILY_CARE_SHEET` uses the strict submitted `YYYY-MM-DD`; `WEEKLY_MENU` normalizes any submitted date to Monday with UTC-safe date arithmetic.
- Accept exactly one real JPEG, PNG, or WebP image, at most 10 MiB; cap the complete multipart body at 11 MiB before `formData()` parsing.
- Generate random server storage keys under `UPLOAD_DIR`; never derive a path from the supplied filename and never place uploads under `public/`.
- One row per `(householdId, childId, type, periodStart)`; a repeated period replaces the image through a retryable serializable metadata/audit transaction.
- Image reads require authentication and return `private, no-store`, `nosniff`, and inline content without a user filename.
- Do not log document bodies, original filenames, storage keys, sessions, or CSRF values.
- Preserve Node 24, Prisma 6, the existing problem envelope, same-origin/CSRF policy, 16px inputs, 44px touch targets, dark mode, and 320px page-width safety.

## Review Focus

- Missing or false `Content-Length` on an oversized chunked multipart body must stop at 11 MiB without unbounded buffering; Task 1 tests the stream reader directly and Task 3 tests the handler.
- Concurrent replacements or delete-versus-replace must leave the database pointing to an existing committed file and emit one audit per successful mutation; Task 2 runs PostgreSQL concurrency tests and Task 3 checks cleanup calls.
- A soft-deleted or cross-household child/document must not be listed, uploaded, deleted, or viewed; Tasks 2 and 3 exercise every boundary.
- A menu date at Sunday/Monday and across a year boundary must normalize to the intended Monday independent of host timezone; Task 1 tests exact dates under a non-Shanghai process timezone.
- Database and upload-volume backups must be paired and safely restorable; Task 5 tests manifest/checksum/tar-path behavior and performs a Compose restore smoke including an authenticated image read.

---

### Task 1: Calendar, bounded multipart, and local file-store primitives

**Files:**
- Create: `src/modules/kindergarten-documents/document-record.ts`
- Create: `src/modules/kindergarten-documents/document-record.test.ts`
- Create: `src/modules/kindergarten-documents/bounded-form-data.ts`
- Create: `src/modules/kindergarten-documents/bounded-form-data.test.ts`
- Create: `src/modules/kindergarten-documents/document-file-store.ts`
- Create: `src/modules/kindergarten-documents/document-file-store.test.ts`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `KindergartenDocumentTypeValue`, `documentUploadFieldsSchema`, `normalizePeriodStart(type, date): string`, `sanitizeOriginalFileName(name): string`, and `validateImage(file): Promise<ValidatedImage>` where `ValidatedImage` contains normalized MIME, extension, safe original name, size, and bytes.
- Produces: `readBoundedFormData(request, 11 * 1024 * 1024): Promise<FormData>` and typed `MultipartBodyError` values for malformed and oversized bodies.
- Produces: `DocumentFileStore` with `write(bytes, extension)`, `read(storageKey)`, and `remove(storageKey)`, plus `createLocalDocumentFileStore(rootDir)`.

- [ ] **Step 1: Write failing domain tests** for strict impossible dates, leap days, Sunday/Monday and cross-year menu normalization, filename control-character removal/255-character cap, empty/oversized image rejection, MIME/magic disagreement, and JPEG/PNG/WebP signatures.
- [ ] **Step 2: Run** `npm test -- --run src/modules/kindergarten-documents/document-record.test.ts` and verify failures are missing-module/behavior failures.
- [ ] **Step 3: Implement `document-record.ts`** with pure UTC calendar arithmetic, Zod field validation, exact signature detection, one-file 10 MiB enforcement, and no extension trust.
- [ ] **Step 4: Write failing bounded-body tests** using chunked `ReadableStream` requests with absent, false, and excessive `Content-Length`; assert parsing stops once the 11 MiB boundary is crossed and valid multipart still parses.
- [ ] **Step 5: Implement `bounded-form-data.ts`** by accumulating only through the limit, cancelling on overflow, rebuilding a Request with the bounded bytes/headers, then calling `formData()`.
- [ ] **Step 6: Write failing file-store tests** in a temporary directory for atomic write/read/remove, random controlled keys, idempotent removal, traversal rejection, and cleanup after rename/write failure.
- [ ] **Step 7: Implement `document-file-store.ts`** with UUID keys, same-directory temporary files and atomic rename; add `.data/` to `.gitignore` and default runtime storage there outside Compose.
- [ ] **Step 8: Run** the three focused files plus `npm run typecheck`; expect all pass.
- [ ] **Step 9: Commit** with `feat: add secure document storage primitives`.

### Task 2: Prisma metadata, household isolation, replacement, and audit

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20261023150000_kindergarten_documents/migration.sql`
- Create: `src/modules/kindergarten-documents/document-repository.ts`
- Create: `tests/integration/kindergarten-documents.test.ts`
- Modify: `tests/integration/activity.test.ts`
- Modify: `tests/integration/child-profile.test.ts`
- Modify: `tests/integration/database.test.ts`
- Modify: `tests/integration/emotion.test.ts`
- Modify: `tests/integration/export.test.ts`
- Modify: `tests/integration/growth.test.ts`
- Modify: `tests/integration/history.test.ts`
- Modify: `tests/integration/nutrition.test.ts`
- Modify: `tests/integration/sleep.test.ts`

**Interfaces:**
- Consumes: normalized types and period dates from Task 1.
- Produces: `listDocumentsForChild`, `findDocumentForHousehold`, `upsertDocumentWithAudit`, and `deleteDocumentWithAudit`; mutation results include `replacedStorageKey` or `deletedStorageKey` for post-commit cleanup.

- [ ] **Step 1: Write failing PostgreSQL integration tests** for active-child ownership, unique daily/weekly periods, create versus replacement result, redacted CREATE/UPDATE/DELETE audits, chronological listing, deleted-child rejection, cross-household 404 semantics, concurrent same-period replacements, delete-versus-replace, and a final row whose key belongs to a successful mutation.
- [ ] **Step 2: Run** `npm run db:test:prepare && DATABASE_URL=postgresql://growlog_test:growlog_test@localhost:55432/growlog_test npm test -- --run tests/integration/kindergarten-documents.test.ts`; verify schema/module failures.
- [ ] **Step 3: Add Prisma schema and migration** with enum `KindergartenDocumentType`, model `KindergartenDocument`, active relations from `Household`/`Child`, unique `storageKey`, unique period tuple, and household/child/type/period index; regenerate Prisma Client.
- [ ] **Step 4: Implement repository transactions** with `Serializable` isolation, bounded retry for Prisma `P2034`/unique races, active-child checks inside the transaction, and metadata containing changed field names/type/period only.
- [ ] **Step 5: Update every integration cleanup** to delete `kindergartenDocument` before child/household rows.
- [ ] **Step 6: Re-run** the new integration test, then all integration tests with PostgreSQL; expect pass.
- [ ] **Step 7: Commit** with `feat: persist kindergarten document metadata`.

### Task 3: Authenticated upload, list, image, and delete APIs

**Files:**
- Create: `src/modules/kindergarten-documents/document-handlers.ts`
- Create: `src/modules/kindergarten-documents/document-handlers.test.ts`
- Create: `src/modules/kindergarten-documents/document-runtime.ts`
- Create: `src/app/api/kindergarten-documents/route.ts`
- Create: `src/app/api/kindergarten-documents/[documentId]/route.ts`
- Create: `src/app/api/kindergarten-documents/[documentId]/image/route.ts`
- Modify: `src/app/api/auth/auth-routes.test.ts` or add route-focused assertions to `document-handlers.test.ts`

**Interfaces:**
- Consumes: Task 1 validation/body/store interfaces and Task 2 repository operations.
- Produces: `createKindergartenDocumentHandlers(dependencies)` with `list`, `upload`, `remove`, and `image`; response metadata omits `storageKey` and exposes `/api/kindergarten-documents/{id}/image?v={updatedAt}`.

- [ ] **Step 1: Write failing handler tests** for anonymous GET 401; mutation without valid CSRF/origin 403 before parsing; missing/false-length oversized body 413; malformed multipart, multiple images, invalid dates/MIME/magic 400; active-child create 201; same-period replace 200 plus old-file removal; DB failure new-file cleanup; list serialization; image headers/body; missing disk file generic 404; delete confirmation endpoint; and cross-household/deleted-child 404.
- [ ] **Step 2: Run** `npm test -- --run src/modules/kindergarten-documents/document-handlers.test.ts` and verify missing implementation failures.
- [ ] **Step 3: Implement handlers** using the existing `requireRequestAuth` problem-envelope pattern, never setting multipart `Content-Type` manually, and mapping `MultipartBodyError` to 400/413 without leaking internals.
- [ ] **Step 4: Implement runtime wiring** from `UPLOAD_DIR ?? path.join(process.cwd(), ".data/uploads")`, Prisma, auth config, session repository, repository functions, and local file store.
- [ ] **Step 5: Add thin force-dynamic route files** that delegate GET/POST/DELETE/image calls with resolved params.
- [ ] **Step 6: Run** handler tests, related auth tests, lint, and typecheck; expect pass.
- [ ] **Step 7: Commit** with `feat: add protected kindergarten document APIs`.

### Task 4: Settings entry, upload manager, history, and image dialog

**Files:**
- Modify: `src/app/(protected)/_components/app-icon.tsx`
- Modify: `src/app/(protected)/_components/app-icon.test.tsx`
- Modify: `src/app/(protected)/settings/page.tsx`
- Modify: `src/app/(protected)/settings/page.test.tsx`
- Create: `src/app/(protected)/settings/kindergarten-documents/page.tsx`
- Create: `src/app/(protected)/settings/kindergarten-documents/page.test.tsx`
- Create: `src/app/(protected)/settings/kindergarten-documents/document-manager.tsx`
- Create: `src/app/(protected)/settings/kindergarten-documents/document-manager.test.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/app/mobile-ui-contract.test.ts`

**Interfaces:**
- Consumes: Task 3 metadata/API shapes; server page consumes `listChildrenForHousehold` and passes `{id,name}` children to the client manager.
- Produces: Settings route `/settings/kindergarten-documents`, separate care-sheet/menu forms, versioned authenticated images, document history, replacement warning, confirmed delete, and accessible dialog/fallback links.

- [ ] **Step 1: Write failing Settings/icon/page tests** for the new `documents` line icon and “幼儿园资料” menu link, no-child Add Child state, active child selector, two upload regions, and absence of server-rendered private file paths.
- [ ] **Step 2: Write failing client tests** for child list fetch, valid date/file submission with CSRF, local preview lifecycle/revocation, care-sheet/menu labels, replacement warning, pending/success/error states, versioned image URL, dialog open/Escape/close/focus return, fallback link, and confirmed delete/refresh.
- [ ] **Step 3: Implement the icon, Settings link, protected server page, and client manager** using `next/image` with `unoptimized` for authenticated images and object URLs only for pre-upload previews.
- [ ] **Step 4: Write failing CSS contract tests** for 16px file/date/select controls, 44/48px actions, responsive one-column cards at 320px, contained image aspect ratios, dialog backdrop/focus, scroll-safe history, and dark-mode token use.
- [ ] **Step 5: Implement scoped styles** in the existing visual system without changing the four-tab information architecture.
- [ ] **Step 6: Run** the focused UI/CSS/icon tests, lint, and typecheck; expect pass.
- [ ] **Step 7: Commit** with `feat: add kindergarten document settings UI`.

### Task 5: Persistent volume and coordinated backup/restore

**Files:**
- Modify: `docker-compose.yml`
- Modify: `Dockerfile`
- Modify: `.env.production.example`
- Create: `scripts/backup-all.sh`
- Create: `scripts/restore-uploads.sh`
- Create: `src/app/kindergarten-documents-deployment.test.ts`
- Modify: `docs/DEPLOYMENT.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: runtime `UPLOAD_DIR` from Task 3.
- Produces: `uploads_data:/data/uploads`, coordinated backup bundle `{id}.dump`, `{id}-uploads.tar`, SHA-256 sidecars, and `{id}.manifest`; upload restore defaults to a verification target and requires `ALLOW_RESTORE_OVER_PRIMARY=true` for the primary volume.

- [ ] **Step 1: Write failing deployment contract tests** that parse Compose/Docker/env/scripts/docs and assert the volume mount, `UPLOAD_DIR`, coordinated app pause/restart trap, shared backup ID, manifest checksums, safe relative tar validation, explicit primary-restore guard, and documented restore/image verification.
- [ ] **Step 2: Run** `npm test -- --run src/app/kindergarten-documents-deployment.test.ts` and verify expected failures.
- [ ] **Step 3: Add the volume/configuration** and ensure the runner image owns/creates the upload directory without making it public.
- [ ] **Step 4: Implement `backup-all.sh`** as a wrapper that pauses app writes, invokes the existing PostgreSQL dump, streams the mounted upload directory to tar, writes sidecars/manifest under umask 077, and restarts the app via trap.
- [ ] **Step 5: Implement `restore-uploads.sh`** with checksum/manifest verification, rejection of absolute/`..` tar members, separate verification target by default, and explicit guarded primary replacement.
- [ ] **Step 6: Update deployment and README instructions** to pair database/image backups and explain failure modes if only one half is restored.
- [ ] **Step 7: Run** deployment tests and `docker compose config` with non-secret placeholders; expect pass.
- [ ] **Step 8: Commit** with `ops: persist and back up uploaded documents`.

### Task 6: Durable project state and release verification

**Files:**
- Modify: `TASKS.md`
- Modify: `PROGRESS.md`
- Modify: `DECISIONS.md`
- Modify: `scripts/mvp-smoke.mjs` if HTTP smoke coverage can use a fixture without embedding it

**Interfaces:**
- Consumes: all prior tasks.
- Produces: verified M25 milestone, final release evidence, and an ADR for authenticated local-volume document storage/coordinated backup.

- [ ] **Step 1: Add M25 acceptance and ADR** covering child-scoped period uniqueness, authenticated file serving, local-volume tradeoff, replacement semantics, and coordinated backup.
- [ ] **Step 2: Run the clean automated gate:** `npm run db:test:prepare`, PostgreSQL-enabled `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, and `git diff --check`; record exact counts.
- [ ] **Step 3: Run production browser acceptance** at 320/390/430/768 in light/dark from an empty household through child creation, both uploads, same-period replacement, cross-week history, dialog/fallback viewing, delete, reload persistence, and fixed-nav/overflow checks.
- [ ] **Step 4: Run Compose persistence/recovery acceptance** with generated non-sensitive JPEG/PNG/WebP fixtures: upload, recreate app container, read identical bytes, create coordinated backup, restore into verification DB/volume, start verification config, authenticate, and read identical bytes/checksums.
- [ ] **Step 5: Request whole-branch review** against the spec, focusing on the five Review Focus lines; fix every Critical/Important finding with a failing regression first.
- [ ] **Step 6: Re-run the complete gate after review fixes**, update `PROGRESS.md` with final evidence/blockers/next step, and commit with `feat: deliver kindergarten document uploads`.
