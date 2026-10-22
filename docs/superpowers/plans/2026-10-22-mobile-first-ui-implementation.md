# GrowLog Mobile-first UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 GrowLog 已验证的 MVP 界面改造成适合 320–430px 手机单手操作的应用界面，同时保持现有 API、数据模型和业务规则不变。

**Architecture:** 保留 Next.js App Router 的服务端数据加载，把仅需要路径状态、退出请求和表单交互的部分放进小型客户端组件。共享的导航、渐进展开和移动样式形成展示层契约，各领域表单继续调用原有 API 与 CSRF 流程。

**Tech Stack:** Next.js 15 App Router、React 19、TypeScript、CSS、Vitest、Testing Library、Prisma/PostgreSQL

**Spec:** `docs/superpowers/specs/2026-10-22-mobile-first-ui-design.md`

## Global Constraints

- 主要验收视口为 320–430px；431–759px 延续移动布局；760px 以上使用桌面顶部导航。
- 表单控件字体至少 16px，普通触控目标至少 44px，主要输入和提交按钮至少 48px。
- 不增加第三方 UI、图标或动画依赖；图标使用轻量内联 SVG。
- 保留现有 API 路径、请求结构、Prisma schema、认证协议、审计和软删除规则。
- 健康数据继续由服务端加载，不写入浏览器存储或 Service Worker 缓存。
- 成功消息使用 `role="status"`，错误消息使用 `role="alert"`；删除必须确认，恢复直接执行。
- 遵守 `prefers-reduced-motion` 和亮/暗色 WCAG AA 对比目标。
- 依照 `AGENTS.md` 在现有 `work` 分支执行，不创建额外 worktree。

## Review Focus

- 子路由（如 `/children/:id/growth`）必须把“档案”标为当前导航项；Task 1 的导航测试覆盖路径前缀匹配。
- 退出请求缺少 CSRF cookie 或网络失败时必须保留当前页面并显示安全错误；Task 2 的测试覆盖失败分支。
- 编辑记录若已有低频字段值，“更多信息”必须默认展开；Task 3 的领域表单测试覆盖新增与编辑两种状态。
- 用户取消删除确认时不能发出请求；Task 4 的表单测试覆盖取消和确认路径。
- 320px 宽度、底部安全区和暗色完成卡不能产生遮挡或低对比；Task 6 的静态样式契约与生产构建共同覆盖。

---

### Task 1: Mobile application navigation

**Files:**
- Create: `src/app/(protected)/_components/app-navigation.tsx`
- Create: `src/app/(protected)/_components/app-navigation.test.tsx`
- Modify: `src/app/(protected)/layout.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: Next.js `usePathname(): string` and the existing routes `/today`, `/history`, `/children`, `/settings`.
- Produces: `AppNavigation(): JSX.Element`, rendering `.desktop-app-nav` and `.mobile-app-nav`, with one matching link carrying `aria-current="page"`.

- [ ] **Step 1: Write the failing navigation tests**

  Add cases that mock `usePathname` for `/today` and `/children/child-1/growth`, assert four named links, assert the matching link has `aria-current="page"`, and assert both desktop and mobile navigation landmarks have distinct accessible labels.

- [ ] **Step 2: Run the navigation test and verify RED**

  Run: `npm test -- 'src/app/(protected)/_components/app-navigation.test.tsx'`

  Expected: FAIL because `app-navigation.tsx` does not exist.

- [ ] **Step 3: Implement navigation and protected layout integration**

  Implement `AppNavigation` with a fixed route table, prefix matching for `/children`, inline `aria-hidden` SVG icons, and concise labels “今天 / 历史 / 档案 / 设置”. Replace the layout’s existing nav with this component. Add the structural CSS needed to hide mobile nav at 760px and hide desktop nav below 760px, including `env(safe-area-inset-bottom)` and page bottom clearance.

- [ ] **Step 4: Run the focused test and verify GREEN**

  Run: `npm test -- 'src/app/(protected)/_components/app-navigation.test.tsx'`

  Expected: 2 tests pass.

- [ ] **Step 5: Commit**

  Run: `git add 'src/app/(protected)/_components/app-navigation.tsx' 'src/app/(protected)/_components/app-navigation.test.tsx' 'src/app/(protected)/layout.tsx' src/app/globals.css && git commit -m "feat: add mobile application navigation"`

### Task 2: Safe account logout

**Files:**
- Create: `src/app/(protected)/settings/logout-button.tsx`
- Create: `src/app/(protected)/settings/logout-button.test.tsx`
- Modify: `src/app/(protected)/settings/page.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `CSRF_COOKIE_NAME`, `POST /api/auth/logout`, Next.js `useRouter`.
- Produces: `LogoutButton(): JSX.Element`, which sends `x-csrf-token`, reports pending/error state, then calls `router.replace("/login")` and `router.refresh()` after success.

- [ ] **Step 1: Write failing logout tests**

  Test a successful request’s method/header/redirect, pending button label, and a failed response/network request that renders `role="alert"` without navigation.

- [ ] **Step 2: Run the logout test and verify RED**

  Run: `npm test -- 'src/app/(protected)/settings/logout-button.test.tsx'`

  Expected: FAIL because `logout-button.tsx` does not exist.

- [ ] **Step 3: Implement the button and settings account section**

  Add `LogoutButton`, place it in a labelled “账户” section after exports, and use the existing logout endpoint and cookie name. Keep errors generic and do not expose response bodies.

- [ ] **Step 4: Run the focused test and verify GREEN**

  Run: `npm test -- 'src/app/(protected)/settings/logout-button.test.tsx'`

  Expected: all logout tests pass.

- [ ] **Step 5: Commit**

  Run: `git add 'src/app/(protected)/settings' src/app/globals.css && git commit -m "feat: add safe settings logout"`

### Task 3: Progressive disclosure for record forms

**Files:**
- Create: `src/app/(protected)/_components/optional-fields.tsx`
- Create: `src/app/(protected)/_components/optional-fields.test.tsx`
- Create: `src/app/(protected)/children/[childId]/record-forms.test.tsx`
- Modify: `src/app/(protected)/children/[childId]/growth/growth-form.tsx`
- Modify: `src/app/(protected)/children/[childId]/sleep/sleep-form.tsx`
- Modify: `src/app/(protected)/children/[childId]/nutrition/nutrition-client.tsx`
- Modify: `src/app/(protected)/children/[childId]/activity/activity-form.tsx`
- Modify: `src/app/(protected)/children/[childId]/emotion/emotion-form.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: React `children`, a label string, and each record DTO’s existing optional values.
- Produces: `OptionalFields({ children, defaultOpen?, label? }): JSX.Element`, backed by native `<details>`; every domain form keeps its current field names and payload.

- [ ] **Step 1: Write failing optional-field tests**

  Test that `OptionalFields` renders a native details element labelled “更多信息”, is closed by default, and is open when `defaultOpen` is true.

- [ ] **Step 2: Write failing domain form tests**

  Render growth, sleep, activity, emotion, meal, and beverage creation forms and assert the spec’s default fields remain outside “更多信息”. Render representative edited records with optional values and assert their details elements carry `open` while the existing values remain present.

- [ ] **Step 3: Run the form tests and verify RED**

  Run: `npm test -- 'src/app/(protected)/_components/optional-fields.test.tsx' 'src/app/(protected)/children/[childId]/record-forms.test.tsx' 'src/app/(protected)/children/[childId]/nutrition/nutrition-client.test.tsx'`

  Expected: FAIL because `OptionalFields` does not exist and current forms display all fields at once.

- [ ] **Step 4: Implement progressive disclosure without changing payloads**

  Move only the fields listed in the spec’s “更多信息” column into `OptionalFields`. Compute `defaultOpen` from existing optional values for edit forms. Keep required/default inputs, names, types, limits, defaults, fetch endpoints, and payload serialization unchanged. Give all forms consistent section and summary classes.

- [ ] **Step 5: Run the focused form suites and verify GREEN**

  Run: `npm test -- 'src/app/(protected)/_components/optional-fields.test.tsx' 'src/app/(protected)/children/[childId]/record-forms.test.tsx' 'src/app/(protected)/children/[childId]/nutrition/nutrition-client.test.tsx'`

  Expected: all optional-field and record-form tests pass.

- [ ] **Step 6: Commit**

  Run: `git add 'src/app/(protected)/_components/optional-fields.tsx' 'src/app/(protected)/_components/optional-fields.test.tsx' 'src/app/(protected)/children/[childId]' src/app/globals.css && git commit -m "feat: simplify mobile record forms"`

### Task 4: Destructive action safeguards and message semantics

**Files:**
- Create: `src/app/(protected)/_components/confirm-delete.ts`
- Create: `src/app/(protected)/_components/confirm-delete.test.ts`
- Modify: `src/app/(protected)/children/[childId]/growth/growth-form.tsx`
- Modify: `src/app/(protected)/children/[childId]/sleep/sleep-form.tsx`
- Modify: `src/app/(protected)/children/[childId]/nutrition/nutrition-client.tsx`
- Modify: `src/app/(protected)/children/[childId]/activity/activity-form.tsx`
- Modify: `src/app/(protected)/children/[childId]/emotion/emotion-form.tsx`
- Modify: `src/app/(protected)/children/[childId]/record-forms.test.tsx`

**Interfaces:**
- Consumes: record label and browser `window.confirm`.
- Produces: `confirmRecordDeletion(recordLabel: string): boolean`, with the exact prompt `确认删除这条${recordLabel}？删除后可从历史记录恢复。`.

- [ ] **Step 1: Write failing confirmation and integration tests**

  Test the prompt text and return value. In a representative form, click delete with `window.confirm` returning false and assert `fetch` is not called; repeat with true and assert the existing DELETE endpoint is called. Assert failed saves/actions use `role="alert"` and successful saves use `role="status"`.

- [ ] **Step 2: Run the tests and verify RED**

  Run: `npm test -- 'src/app/(protected)/_components/confirm-delete.test.ts' 'src/app/(protected)/children/[childId]/record-forms.test.tsx' 'src/app/(protected)/children/[childId]/nutrition/nutrition-client.test.tsx'`

  Expected: FAIL because deletion runs without confirmation and message roles are inconsistent.

- [ ] **Step 3: Implement safeguards in all six record types**

  Call `confirmRecordDeletion` before growth, sleep, meal, beverage, activity, and emotion DELETE requests. Add explicit `type="button"` to non-submit buttons, clear stale messages before lifecycle calls, and separate error state from success state so roles are deterministic. Restore remains one step.

- [ ] **Step 4: Run focused suites and verify GREEN**

  Run: `npm test -- 'src/app/(protected)/_components/confirm-delete.test.ts' 'src/app/(protected)/children/[childId]/record-forms.test.tsx' 'src/app/(protected)/children/[childId]/nutrition/nutrition-client.test.tsx'`

  Expected: all confirmation, status, and existing nutrition edit tests pass.

- [ ] **Step 5: Commit**

  Run: `git add 'src/app/(protected)/_components/confirm-delete.ts' 'src/app/(protected)/_components/confirm-delete.test.ts' 'src/app/(protected)/children/[childId]' && git commit -m "feat: confirm record deletion"`

### Task 5: Mobile page hierarchy and quick actions

**Files:**
- Create: `src/app/(protected)/_components/domain-links.tsx`
- Create: `src/app/(protected)/_components/domain-links.test.tsx`
- Create: `src/app/(protected)/children/child-profile-form.test.tsx`
- Modify: `src/app/(protected)/today/page.tsx`
- Modify: `src/app/(protected)/children/page.tsx`
- Modify: `src/app/(protected)/children/[childId]/page.tsx`
- Modify: `src/app/(protected)/children/child-profile-form.tsx`
- Modify: `src/app/(protected)/history/page.tsx`
- Modify: `src/app/(protected)/settings/page.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `childId: string` and the five existing domain routes.
- Produces: `DomainLinks({ childId }): JSX.Element`, a labelled two-column grid with “身高体重 / 睡眠 / 饮食奶水 / 运动户外 / 情绪观察”.

- [ ] **Step 1: Write failing domain-link and profile-group tests**

  Assert the five links have their exact child-scoped URLs, readable labels, and one labelled navigation region. Render `ChildProfileForm` and assert its inputs are grouped under “基本信息 / 出生信息 / 家庭信息 / 备注”, with the existing input names preserved.

- [ ] **Step 2: Run the test and verify RED**

  Run: `npm test -- 'src/app/(protected)/_components/domain-links.test.tsx' 'src/app/(protected)/children/child-profile-form.test.tsx'`

  Expected: FAIL because `domain-links.tsx` does not exist and the child form has no semantic groups.

- [ ] **Step 3: Implement page hierarchy changes**

  Use `DomainLinks` on the child detail page and group `ChildProfileForm` with fieldsets and legends. Compress Today to “今天” plus secondary date, remove English eyebrows from protected pages, make completion cards the first child-card action, turn metrics into a single-column mobile list, add scroll-snap quick actions, stack history entry metadata, and present export/account actions vertically on mobile. Keep server queries, input names, and link destinations unchanged.

- [ ] **Step 4: Run focused and existing dashboard tests**

  Run: `npm test -- 'src/app/(protected)/_components/domain-links.test.tsx' 'src/app/(protected)/children/child-profile-form.test.tsx' src/modules/dashboard/dashboard-snapshot.test.ts`

  Expected: domain-link and profile-group tests plus the 2 existing dashboard aggregation tests pass.

- [ ] **Step 5: Commit**

  Run: `git add 'src/app/(protected)/_components/domain-links.tsx' 'src/app/(protected)/_components/domain-links.test.tsx' 'src/app/(protected)/today/page.tsx' 'src/app/(protected)/children' 'src/app/(protected)/history/page.tsx' 'src/app/(protected)/settings/page.tsx' src/app/globals.css && git commit -m "feat: optimize mobile page hierarchy"`

### Task 6: Responsive visual system and login polish

**Files:**
- Create: `src/app/mobile-ui-contract.test.ts`
- Modify: `src/app/globals.css`
- Modify: `src/app/login/page.tsx`
- Modify: `src/app/login/login-form.tsx`
- Modify: `src/app/login/login-form.test.tsx`

**Interfaces:**
- Consumes: the existing CSS class names and LoginForm request behavior.
- Produces: CSS variables for mobile spacing, controls, navigation safe area, status colors, focus and reduced motion; LoginForm retains the entered email after a failed submission.

- [ ] **Step 1: Write failing CSS and login behavior tests**

  Add a Node test that reads `globals.css` and asserts the mobile contract: `16px` form-control font, `44px` generic control minimum, `48px` primary/input minimum, `env(safe-area-inset-bottom)`, a `760px` desktop breakpoint, dark-mode completion foreground colors, and `prefers-reduced-motion`. Extend LoginForm tests with a regression case that submits an email through a failed request and asserts the email value remains, the error is an alert, and the button returns from pending state.

- [ ] **Step 2: Run the tests and verify RED**

  Run: `npm test -- src/app/mobile-ui-contract.test.ts src/app/login/login-form.test.tsx`

  Expected: FAIL on the missing CSS contract; the login regression may already pass and then protects the existing email-retention behavior during refactoring.

- [ ] **Step 3: Consolidate mobile-first styles and login layout**

  Introduce explicit color/spacing/control variables, 16px controls, full-width mobile primary actions, visible focus, restrained card shadows, safe-area padding, responsive title scales, 320px overflow guards, status colors with dedicated foregrounds, and reduced-motion overrides. Shorten login copy, prioritize the form on mobile, and keep the controlled email value after failure without retaining the password.

- [ ] **Step 4: Run focused tests, typecheck, and build**

  Run: `npm test -- src/app/mobile-ui-contract.test.ts src/app/login/login-form.test.tsx && npm run typecheck && npm run build`

  Expected: focused tests pass, TypeScript exits 0, and Next.js production build exits 0.

- [ ] **Step 5: Commit**

  Run: `git add src/app/globals.css src/app/mobile-ui-contract.test.ts src/app/login && git commit -m "feat: apply mobile-first visual system"`

### Task 7: Durable project records and release verification

**Files:**
- Modify: `TASKS.md`
- Modify: `PROGRESS.md`
- Modify: `DECISIONS.md`

**Interfaces:**
- Consumes: verified outputs from Tasks 1–6.
- Produces: milestone `M15` with evidence, ADR-022 for the mobile presentation boundary, and a final project recovery point.

- [ ] **Step 1: Add M15 and architecture records**

  Add M15 to `TASKS.md` using the design’s ten acceptance criteria, mark it verified only after the full gate passes, record ADR-022 (“移动端展示层保持业务边界不变”), and update `PROGRESS.md` with changed behavior, tests, unresolved limits, and the next step.

- [ ] **Step 2: Run the full verification gate**

  Run: `npm run lint && npm run typecheck && npm test && npm run build`

  Expected: lint has zero warnings, typecheck exits 0, every Vitest test passes, and the production build exits 0.

- [ ] **Step 3: Inspect the complete diff against the spec**

  Run: `git diff --check && git status --short && git diff --stat 06afc32`

  Expected: no whitespace errors; only planned UI, test, and durable-record files are changed; all ten acceptance criteria map to implementation or recorded verification.

- [ ] **Step 4: Commit project records**

  Run: `git add TASKS.md PROGRESS.md DECISIONS.md && git commit -m "docs: record mobile UI verification"`

- [ ] **Step 5: Request whole-branch review and finish**

  Build the `superpowers:requesting-code-review` package for `06afc32..HEAD`, address Critical/Important findings through RED→GREEN tests, rerun the full gate, then use `superpowers:finishing-a-development-branch`. Push to GitHub `main` only after review and final verification, using the user’s standing request to keep the repository synchronized.
