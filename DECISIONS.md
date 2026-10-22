# GrowLog architecture decisions

## ADR-001 — Modular monolith

Use one Next.js deployment with domain modules and explicit persistence interfaces. This keeps the private-family MVP operationally small while preserving boundaries that can later be extracted.

## ADR-002 — PostgreSQL is the source of truth

All durable application data lives in PostgreSQL through Prisma. Browser storage may cache non-sensitive UI state but never acts as the only persistence layer.

## ADR-003 — Household isolation from the first migration

Every query is scoped to the authenticated administrator’s household. Models carry `householdId` where direct scoping prevents ambiguous joins. This adds small schema repetition and avoids a risky multi-tenant retrofit.

## ADR-004 — Soft deletion plus append-only audit events

Mutable health records use `deletedAt`; create, update, delete, and restore append audit records. Hard deletion is reserved for a separately authorized maintenance operation outside the normal UI.

## ADR-005 — Calendar dates and instants are distinct

Household reporting dates use ISO date strings interpreted in the household IANA time zone. Actual moments use UTC timestamps. Sleep sessions store start/end instants so crossing midnight is unambiguous.

## ADR-006 — Medical claims require versioned evidence

P0 shows measurements and descriptive trends only. Percentiles, Z-scores, age recommendations, and risk rules are enabled only with a named authoritative source, applicable age range, and versioned data set.

## ADR-007 — Native inline execution on branch `work`

The cloud checkout is clean and already uses the non-main `work` branch. Development stays in this checkout so the requested durable project files remain at the repository root. A nested worktree would make the environment snapshot and recovery path less direct.

## ADR-008 — Preserve Prisma artifact verification

The environment currently blocks `binaries.prisma.sh`. Do not set `PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING` or vendor an engine assembled through an internal WASM adapter. Save the required domain in cloud configuration and wait for that rule to be published. Static schema validation may use Prisma's npm-published WASM from the exact engine commit, but it does not replace migration and client verification.

## ADR-009 — Authentication core is persistence-agnostic

Authentication rules depend on a small `SessionRepository` contract. Production uses a lazy Prisma adapter, while unit and route tests use an in-memory implementation. This lets security behavior remain tested without hiding the outstanding real-PostgreSQL integration requirement.

## ADR-010 — Mutation origin follows the externally visible request authority

Validate browser `Origin` against `X-Forwarded-Host`/`X-Forwarded-Proto` when supplied by the deployment proxy, then `Host`, with the request URL as fallback. This preserves same-origin protection when Next.js receives an internal URL behind Caddy or another trusted proxy; the per-session CSRF digest remains required independently.

## ADR-011 — Shared database integration tests run sequentially

Integration test files share one disposable `growlog_test` schema and clean tables before each case. Vitest disables file-level parallelism so independent cleanup hooks cannot delete another test's parent rows mid-transaction. Unit cases remain isolated and the suite is small enough that deterministic execution is the better tradeoff.

## ADR-012 — Outdoor time and exercise intensity remain independent

Each activity stores total duration, optional outdoor minutes, and an explicit intensity. Weekly outdoor totals use only `outdoorMinutes`; moderate/vigorous totals use total duration only when intensity is marked `MODERATE` or `VIGOROUS`. This prevents a light-intensity outdoor session from being presented as effective moderate/vigorous exercise.

## ADR-013 — Emotion trends are descriptive counts

Emotion summaries count submitted observations by mood and tag in household-local 7/30-day windows. They do not calculate a wellness score, infer an unrecorded state, or label a psychological or neurodevelopmental condition. The UI states that frequency depends on what the caregiver recorded.

## ADR-014 — Dashboard absence remains unknown

The Today dashboard reports completion from records assigned to the household-local date. Missing records and unknown beverage quantities remain visibly unknown instead of becoming invented zeros. Trend notices describe submitted 7-day data and state their limits; quick actions reuse the domain forms rather than duplicating mutation logic.

## ADR-015 — Unified history delegates mutations to domain pages

The household timeline normalizes record summaries and links each entry to its domain page, where existing validation, CSRF checks, edit, soft-delete, and restore behavior remain authoritative. Audit rendering exposes actor, action, entity, timestamp, and changed field names; it discards all other metadata values before presentation.

## ADR-016 — Exports are versioned, scoped, and credential-free

Household JSON declares `exportVersion: 1`; CSV is split by domain with units in column names. Both load by authenticated household, omit admin sessions and credential material, redact audit values, and exclude soft-deleted rows unless requested. CSV quoting follows common spreadsheet rules and text that could be interpreted as a formula is prefixed safely.

## ADR-017 — PWA cache holds no household data

The service worker caches only public shell assets and immutable Next static files. Authenticated navigations always go to the network and fall back to a public offline page without being written to Cache Storage. API requests bypass service-worker caching, and server headers mark all API responses private and no-store.

## ADR-018 — Production runtime uses Node 24 and prebuilt Prisma assets

The production image uses the active Node 24 line required by the current test toolchain. Prisma Client and engine artifacts are generated in the builder and copied with the verified dependency tree into the runtime image, so container startup applies migrations without reaching an external package or engine registry.

## ADR-019 — Health means application and database readiness

`/api/health` performs a minimal PostgreSQL query before reporting readiness. Database failures return a generic 503 problem without connection details. Compose waits for this application health check before starting the public proxy, preventing a process-only status from advertising an unusable deployment.

## ADR-020 — Restore is isolated and explicit by default

Backups use PostgreSQL's custom format plus a SHA-256 companion file. Restore requires a named target database different from the configured primary database unless the operator sets an explicit destructive override. Verification compares migration and domain-row counts before traffic is redirected.

## ADR-021 — Framework-major security remediation is an isolated P1 migration

The production dependency audit has no critical findings but reports transitive Prisma CLI and bundled Next.js PostCSS advisories. Their inputs are limited to checked-in schema, configuration, CSS, and source maps; request and uploaded user data do not reach the affected operations. Automated remediation requires Prisma 7 and Next.js 16 major upgrades, so the MVP records this bounded exposure and tracks both migrations as an isolated P1 change with full database, build, HTTP, and recovery re-verification.

## ADR-022 — 移动端展示层保持业务边界不变

移动端优化只在展示层增加路径状态导航、安全退出按钮、原生 `<details>` 渐进展开和共享响应式样式。健康数据继续由服务端组件读取，各领域表单继续使用原有 API、CSRF 和校验规则；营养表单在保持既有 schema 的同时补齐先前 UI 未提交的可选字段。Prisma schema、仓库层、审计、家庭隔离及 Service Worker 缓存边界不变。内联 SVG 和原生 HTML 控件避免引入新的 UI、图标或动画依赖，使移动体验可以独立演进而不改变已经验证的业务规则。

## ADR-023 — 儿童档案详情采用查看优先

儿童姓名、出生信息和家庭身高属于低频修改资料。默认档案路由只显示只读摘要与高频健康记录入口，编辑表单移至独立的子路由；编辑页继续复用原有 API、CSRF、校验、家庭隔离和审计流程，保存成功后返回详情。这样减少手机端长期占屏内容，同时保留清晰可发现的低频修改入口。
