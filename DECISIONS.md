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

## ADR-024 — 日常历史与低频数据管理分离

日常历史只查询有效记录，并按家庭时区的自然日分组。卡片保留分类、儿童、标题、领域摘要和时间，通过右滑或键盘操作显示编辑入口，以减少手机端纵向占用和视觉噪声。软删除记录与脱敏审计事件集中到设置下的独立数据管理页；恢复操作继续调用既有家庭隔离 API 并携带 CSRF 凭据。各领域日常页面不再查询软删除数据，使恢复与审计能力可发现但不干扰高频录入和回顾。

## ADR-025 — 档案负责查看，设置负责录入和维护

档案首页在没有孩子时仅显示添加入口；已有孩子时显示选择列表。五个分类路由展示图表和只读表格，完整基础资料表单与所有录入/编辑表单放在设置下。原编辑链接重定向到设置，今天快捷录入和历史编辑同步指向新路由。复用原有表单/API/家庭隔离，不增加持久化模型。身高和体重分别绘图，横轴按真实时间间隔排列并显示日期，纵轴明确 cm/kg。睡眠按醒来日汇总，饮品/户外等只要当天有未知数值就保持该日总量未知；情绪只呈现观察频次。表格保留单位、来源和原始备注，窄屏仅在表格内横向滚动。

## ADR-026 — 图表交互与身高增长保持可解释

趋势图继续使用原生 SVG，并在数据点上叠加至少 44px 的 HTML 控件，使光标、触摸、键盘焦点都能选择最近的数据点。提示显示家庭时区下的完整日期时间及原始数值和单位；仅按日汇总的数据只显示日期。加载动画只用于帮助识别折线和数据点，并遵守 `prefers-reduced-motion`。年化身高增长只回看相邻两条具有有效身高且时间递增的测量，按 `(本次身高 - 上次身高) / 实际间隔天数 × 365.2425` 计算；首条记录、缺失身高和非正时间间隔显示未记录，不进行预测或医学判断。历史页以日期时间线、记录数和记录日概览强化层级，卡片继续保留完整摘要、右滑和键盘编辑行为。

## ADR-027 — 首页聚焦当天，低频信息按层级收纳

首页只查询并展示家庭时区当天的完成状态、当天汇总和快捷录入，不再读取身高历史或展示最近记录与跨日趋势；长期数据放在档案报告与历史页。可选数值按类型独立判断是否已记录，奶、水和户外时长缺失时保持未知，部分记录缺少数值时明确提示，避免把未填写解释为零。成长表格优先显示时间、身高、年化身高增长、体重、BMI、变化和来源，测量地点、方法、设备、精度及备注保留在原生详情折叠中。设置按儿童与记录、数据与备份、账户分组为触控菜单，继续使用既有认证、导出、录入和审计路径，不改变数据库或 API 边界。

## ADR-028 — 今日对照只使用完整的有记录日

首页用今天之前连续七个家庭时区自然日作为对照窗口，不包含今天。每个指标只使用该指标具有完整数值的日期计算日均值，并显示实际样本天数；没有记录的日期不进入分母，同一天同类记录只要有一项数值缺失，该日该指标就保持未知。今天仍表示截至当前时刻的部分日数据，情绪对照只展示窗口内最常记录的观察及次数，不生成分数或判断。成长测量的表格和图表点统一显示 `YYYY-MM-DD`，睡眠、饮食、活动及情绪等仍保留有意义的时分信息。导航采用“今天、足迹、趋势、设置”的用户任务语义；绿色用于主要操作和完成状态，橙色用于强调与当前状态，红色仅用于删除和错误。

## ADR-029 — 足迹只负责紧凑回顾，首页采用四列周期对照

足迹页继续按家庭自然日分组并保留记录标题、类别、儿童和具体值，但不显示日内时分，也不提供滑动或键盘编辑入口；标题放左侧，类别、儿童和值合并在右侧，以 44px 最小触控高度作为视觉行高下限，维护入口统一留在设置。户外时长未填写时明确显示“户外未记录”，不替换为零。成长测量日期使用独立的不换行元素显示 `YYYY-MM-DD`，完整表格仍只在自身容器内横向滚动。首页每个指标占一整行，固定展示今天、此前 7 天、此前 14 天和此前 30 天；三个历史窗口均排除今天，数值指标沿用完整有记录日的日均口径，情绪沿用最常记录观察，缺失继续显示为未知。只有饮品而没有餐食记录时，饮食栏保持未知，饮品完成状态不推导餐食数量为零。统计方法只在概览上方说明一次，卡片使用短单位和值以控制手机端高度；这取代 ADR-028 中逐卡展示样本天数的呈现方式，聚合结果仍保留样本数供测试和后续解释使用。

## ADR-030 — 趋势报告用结构表达交互，测量表保持紧凑触控

今天与趋势入口的顶部文案只说明当前页面任务，不重复基础资料或异常判断说明。趋势报告保留家庭时区计算、图表点的指针/触摸/键盘交互及无障碍标签，但不再展示时区、维护入口和操作方法的常驻说明；标题、坐标、表头和设置菜单已能表达这些信息。身高体重测量表使用专属样式，将表头与单元格水平、垂直居中并保持单行，通过缩小单元格上下内边距降低闭合行高；“查看详情”仍保留 44px 触控高度，详情展开后允许正文换行。

## ADR-031 — 紫色承担品牌层级，状态颜色只表达语义

全站采用中性画布、白色或深色表面、柔和边框和统一圆角建立现代极简层级；紫色只用于主操作、当前导航、焦点和品牌强调，绿色表示成功或已完成，橙色表示提醒或待补充，红色表示错误和破坏性操作。该决策取代 ADR-028 中“绿色用于主要操作”的视觉分工，但不改变其数据口径和交互语义。导航、趋势入口和设置统一使用无文字内容的内联描边 SVG，避免字体字形差异和额外运行时依赖。亮暗主题分别定义前景/背景成对变量，业务组件只引用语义变量；视觉刷新限于 React 展示标记、共享图标和 CSS，不修改路由、API、校验、数据库、审计、家庭隔离或缓存边界。

## ADR-032 — 幼儿园图片使用认证文件路由和本地持久卷

保教单与菜单必须关联当前家庭的有效儿童。保教单以儿童和自然日唯一，菜单将提交日期按 UTC 安全算法归一到周一并以儿童和周唯一；同周期再次上传表示替换。PostgreSQL只保存类型、周期、原始显示文件名、随机存储键、MIME、字节数和时间戳，图片字节写入 Docker Compose 固定挂载在 `/data/uploads` 的命名卷；文件不进入 `public/`，浏览器只能通过会话保护、家庭隔离、`private, no-store` 和 `nosniff` 的图片路由读取。完整 multipart 流在 11 MiB 处停止，单图上限为 10 MiB，并要求 JPEG、PNG 或 WebP 的声明 MIME 与魔数一致。创建、替换和删除审计只记录类型、周期和变更字段名，不写入文件名、存储键、路径或内容。数据库元数据和文件卷采用共享备份 ID、manifest 与校验和配对；协调备份使用排他锁和临时发布目录。上传卷恢复默认只创建新验证卷，现有卷必须具有 GrowLog 上传标签并显式设置 `ALLOW_REPLACE_EXISTING_UPLOAD_VOLUME=true`，覆盖主上传卷还需同时设置 `ALLOW_RESTORE_OVER_PRIMARY=true`。
