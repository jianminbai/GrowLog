# Modern Minimal UI Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle every GrowLog mobile surface with the approved modern, white-and-violet visual system while preserving all business behavior, semantic status colors, accessibility, and responsive guarantees.

**Architecture:** Keep the existing Next.js page and server-component structure. Consolidate the visual system in `src/app/globals.css`, introduce one shared inline-SVG icon component for navigation/domain/settings surfaces, and make only small presentational TSX changes needed to expose consistent class and icon hooks. Existing behavioral tests remain authoritative; CSS/markup contracts and production browser checks prove the visual migration.

**Tech Stack:** Next.js 15 App Router, React 19, strict TypeScript, CSS custom properties, inline SVG, Vitest, Testing Library, Chromium CDP.

**Spec:** `docs/superpowers/specs/2026-10-23-modern-minimal-ui-refresh-design.md`

## Global Constraints

- Apply the refresh to public home, login, all four protected tabs, reports, settings, data management, and all record/profile forms.
- Use `--brand-violet`/`--brand-violet-strong` for brand and selection; use separate success, warning, and danger token pairs in both light and dark modes.
- Preserve 44px ordinary touch targets, 48px primary controls, 16px form text, safe-area padding, `aria-current`, focus visibility, and reduced-motion behavior.
- Retain all current content, unknown-value semantics, business routes, API/Prisma/auth/security behavior, and household scoping.
- Use existing system fonts and a shared inline-SVG component; add no UI, icon, font, animation, or image dependency.
- Consolidate existing selectors in `globals.css`; do not append a second global override layer.
- Keep semantic green/orange/red roles distinct from violet brand styling and verify foreground/background pairs at WCAG AA contrast.

## Review Focus

- Dark mode: every brand/status surface must use its explicit dark foreground/background pair and remain readable.
- Narrow and long content: 320px pages, long child names, unknown values, and long Chinese descriptions must not create page-level overflow.
- Installed-phone shell: fixed navigation must retain `safe-area-inset-bottom` and never cover the last control.
- Expanded editors: all five record editors with optional fields/history details open must keep 16px inputs and coherent surfaces.
- Visual-only migration: record values, completion states, links, form requests, chart labels, and table semantics must remain unchanged.

---

### Task 1: Visual Tokens and Global Foundation

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/mobile-ui-contract.test.ts`

**Interfaces:**
- Consumes: existing semantic classes and `prefers-color-scheme`/`prefers-reduced-motion` media queries.
- Produces: explicit CSS variables `--brand-violet`, `--brand-violet-strong`, `--surface`, `--surface-muted`, `--success-bg`, `--success-ink`, `--warning-bg`, `--warning-ink`, `--danger-bg`, and `--danger-ink` for later tasks.

- [ ] **Step 1: Write failing visual-token contract tests**

Assert exact approved light tokens, explicit dark token overrides, absence of `--brand-green`, body `#F7F7FA`/surface-based background, system sans headings/brand, 44px/48px sizing, and purple focus treatment. Add contrast calculations for every light/dark brand/status foreground/background pair.

- [ ] **Step 2: Run the contract test and confirm RED**

Run: `npx vitest run src/app/mobile-ui-contract.test.ts`

Expected: FAIL on missing violet/surface/status tokens, Georgia headings, and old green/beige global styling.

- [ ] **Step 3: Replace the root and dark-mode token systems and consolidate global foundations**

Update `:root`, `body`, headings, `.wordmark`, main spacing, focus styles, `.primary-action`, `.danger-action`, fields, common panels, empty states, and reduced-motion rules. Migrate each current `var(--green)` use to brand violet or success green according to meaning, then remove the ambiguous alias.

- [ ] **Step 4: Run focused contract, lint, and type checks**

Run: `npx vitest run src/app/mobile-ui-contract.test.ts && npm run lint && npm run typecheck`

Expected: all commands exit 0.

- [ ] **Step 5: Commit the foundation**

```bash
git add src/app/globals.css src/app/mobile-ui-contract.test.ts
git commit -m "style: establish modern violet visual system"
```

### Task 2: Shared Line-Icon System

**Files:**
- Create: `src/app/(protected)/_components/app-icon.tsx`
- Create: `src/app/(protected)/_components/app-icon.test.tsx`
- Modify: `src/app/(protected)/_components/app-navigation.tsx`
- Modify: `src/app/(protected)/_components/app-navigation.test.tsx`
- Modify: `src/app/(protected)/_components/domain-links.tsx`
- Modify: `src/app/(protected)/_components/domain-links.test.tsx`
- Modify: `src/app/(protected)/settings/page.tsx`
- Modify: `src/app/(protected)/settings/page.test.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: Task 1 brand and surface tokens.
- Produces: `AppIconName` union and `AppIcon({ name, className? }: { name: AppIconName; className?: string })`, rendering decorative `aria-hidden="true"` inline SVG with a shared viewBox/stroke style.

- [ ] **Step 1: Write failing icon-system tests**

Cover all required names: `today`, `history`, `trend`, `settings`, `growth`, `sleep`, `nutrition`, `activity`, `emotion`, `child`, `database`, `backup`, `table`, `account`, `plus`, and `chevron`. Assert mobile navigation, five domain links, and settings menu rows render SVGs and no longer expose the old single-character symbols as icon text.

- [ ] **Step 2: Run icon and navigation tests and confirm RED**

Run: `npx vitest run 'src/app/(protected)/_components/app-icon.test.tsx' 'src/app/(protected)/_components/app-navigation.test.tsx' 'src/app/(protected)/_components/domain-links.test.tsx' 'src/app/(protected)/settings/page.test.tsx'`

Expected: FAIL because `AppIcon` does not exist and domain/settings surfaces still render text symbols.

- [ ] **Step 3: Implement `AppIcon` and migrate consumers**

Move the four existing navigation paths into `AppIcon`, add simple consistent 24×24 stroked paths for domain/settings names, and keep icons decorative beside visible text. Give domain and settings icon containers the common sizing/color hooks defined in CSS.

- [ ] **Step 4: Run focused tests and typecheck**

Run: `npx vitest run 'src/app/(protected)/_components/app-icon.test.tsx' 'src/app/(protected)/_components/app-navigation.test.tsx' 'src/app/(protected)/_components/domain-links.test.tsx' 'src/app/(protected)/settings/page.test.tsx' && npm run typecheck`

Expected: all commands exit 0.

- [ ] **Step 5: Commit the icon system**

```bash
git add 'src/app/(protected)/_components' 'src/app/(protected)/settings/page.tsx' 'src/app/(protected)/settings/page.test.tsx' src/app/globals.css
git commit -m "style: unify application line icons"
```

### Task 3: Public Shell, Login, and Navigation Surfaces

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/login/page.tsx`
- Modify: `src/app/login/login-form.test.tsx`
- Modify: `src/app/(protected)/_components/app-navigation.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/app/mobile-ui-contract.test.ts`

**Interfaces:**
- Consumes: Task 1 tokens and Task 2 `AppIcon`.
- Produces: modern public/login panels plus white surface mobile/desktop navigation with violet current-state treatment.

- [ ] **Step 1: Add failing shell and navigation contracts**

Assert the public/login pages keep their headings/actions while using explicit modern surface hooks; CSS must give navigation a surface background, violet current pill, safe-area padding, ≥52px mobile items, compact sans brand, and 760px desktop switch. Pin long login error and 320px shell overflow risk through existing structural tests.

- [ ] **Step 2: Run public/login/navigation tests and confirm RED**

Run: `npx vitest run src/app/login/login-form.test.tsx 'src/app/(protected)/_components/app-navigation.test.tsx' src/app/mobile-ui-contract.test.ts`

Expected: FAIL on old surface/current-state/brand contracts.

- [ ] **Step 3: Consolidate public, login, and navigation styles**

Use light surfaces, 16–20px radii, thin borders, weak shadow, system sans hierarchy, violet actions and current state. Preserve login form behavior, route landmarks, `aria-current`, bottom safe area, PWA bottom padding, and desktop navigation behavior.

- [ ] **Step 4: Run focused tests and verify buildable CSS**

Run: `npx vitest run src/app/login/login-form.test.tsx 'src/app/(protected)/_components/app-navigation.test.tsx' src/app/mobile-ui-contract.test.ts && npm run lint && npm run typecheck`

Expected: all commands exit 0.

- [ ] **Step 5: Commit shell restyling**

```bash
git add src/app/page.tsx src/app/login 'src/app/(protected)/_components/app-navigation.tsx' src/app/globals.css src/app/mobile-ui-contract.test.ts
git commit -m "style: refresh public and application shells"
```

### Task 4: Today, Footprints, and Trend Reports

**Files:**
- Modify: `src/app/(protected)/today/page.tsx`
- Modify: `src/app/(protected)/today/page.test.tsx`
- Modify: `src/app/(protected)/history/page.tsx`
- Modify: `src/app/(protected)/history/page.test.tsx`
- Modify: `src/app/(protected)/children/page.tsx`
- Modify: `src/app/(protected)/children/page.test.tsx`
- Modify: `src/app/(protected)/children/[childId]/page.tsx`
- Modify: `src/app/(protected)/children/[childId]/page.test.tsx`
- Modify: `src/app/(protected)/_components/child-record-report.tsx`
- Modify: `src/app/(protected)/_components/record-report.test.tsx`
- Modify: `src/app/(protected)/_components/time-series-chart.tsx`
- Modify: `src/app/(protected)/_components/time-series-chart.test.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/app/mobile-ui-contract.test.ts`

**Interfaces:**
- Consumes: Tasks 1–3 tokens, icons, and shell.
- Produces: consistent high-frequency tab surfaces; violet chart line/points; unchanged Today values, history grouping, report content and measurement-table rules.

- [ ] **Step 1: Write failing high-frequency visual contracts**

Assert white light-border dashboard/history/profile/report surfaces; violet Today values/quick actions; green completion and orange missing states; simple history header with domain-only accent marker; violet child/domain entry affordances; violet chart line/dot and neutral grid; retained compact measurement-table CSS. Existing tests must continue to assert exact data, links, grouping, table headers and accessible chart names.

- [ ] **Step 2: Run high-frequency tests and confirm RED**

Run: `npx vitest run 'src/app/(protected)/today/page.test.tsx' 'src/app/(protected)/history/page.test.tsx' 'src/app/(protected)/children/page.test.tsx' 'src/app/(protected)/children/[childId]/page.test.tsx' 'src/app/(protected)/_components/record-report.test.tsx' 'src/app/(protected)/_components/time-series-chart.test.tsx' src/app/mobile-ui-contract.test.ts`

Expected: FAIL on old card/header/chart visual contracts.

- [ ] **Step 3: Restyle Today and Footprints**

Consolidate dashboard child cards, completion items, comparison rows, quick actions, Footprints header/overview/day markers/rows and empty states with approved tokens. Do not change period calculations, missing-value rendering, history ordering or Settings-only editing.

- [ ] **Step 4: Restyle Trends, child pages, reports, charts and tables**

Apply modern selector-card/domain-grid surfaces, violet line-chart interaction, neutral grids, light table headers and consistent report panels. Preserve pointer/touch/keyboard chart behavior, table scrolling and the 53px/44px growth measurement contract.

- [ ] **Step 5: Run focused and type checks**

Run the Task 4 Step 2 command, then `npm run typecheck`.

Expected: all commands exit 0.

- [ ] **Step 6: Commit high-frequency surfaces**

```bash
git add 'src/app/(protected)/today' 'src/app/(protected)/history' 'src/app/(protected)/children' 'src/app/(protected)/_components' src/app/globals.css src/app/mobile-ui-contract.test.ts
git commit -m "style: modernize daily and trend surfaces"
```

### Task 5: Settings, Data Management, and All Editors

**Files:**
- Modify: `src/app/(protected)/settings/page.tsx`
- Modify: `src/app/(protected)/settings/page.test.tsx`
- Modify: `src/app/(protected)/settings/children/page.tsx`
- Modify: `src/app/(protected)/settings/children/navigation.test.tsx`
- Modify: `src/app/(protected)/settings/data-management/page.tsx`
- Modify: `src/app/(protected)/settings/data-management/page.test.tsx`
- Modify: `src/app/(protected)/children/child-profile-form.tsx`
- Modify: `src/app/(protected)/children/child-profile-form.test.tsx`
- Modify: `src/app/(protected)/children/[childId]/{growth,sleep,nutrition,activity,emotion}/**/*.tsx` as required for presentation hooks only
- Modify: corresponding existing form/UI tests under `src/app/(protected)/children/[childId]/`
- Modify: `src/app/(protected)/_components/optional-fields.tsx`
- Modify: `src/app/(protected)/_components/optional-fields.test.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/app/mobile-ui-contract.test.ts`

**Interfaces:**
- Consumes: Tasks 1–4 tokens, icons, panels and button hierarchy.
- Produces: one consistent menu/form/history-card system for every low-frequency management route.

- [ ] **Step 1: Write failing management/form visual contracts**

Assert settings menu icons/surfaces/dividers, neutral data-management cards, violet restore/secondary actions, 48px inputs, 16px input text, purple focus/accent color, surface-based optional fields/history details, full-width primary action, separated red destructive action, and disabled/pending states. Add representative tests for long labels and every editor with optional fields opened; retain request payload and status-role assertions.

- [ ] **Step 2: Run settings/form tests and confirm RED**

Run: `npx vitest run 'src/app/(protected)/settings/page.test.tsx' 'src/app/(protected)/settings/children/navigation.test.tsx' 'src/app/(protected)/settings/data-management/page.test.tsx' 'src/app/(protected)/settings/data-management/restore-deleted-record-button.test.tsx' 'src/app/(protected)/settings/logout-button.test.tsx' 'src/app/(protected)/children/child-profile-form.test.tsx' 'src/app/(protected)/children/[childId]/record-forms.test.tsx' 'src/app/(protected)/children/[childId]/nutrition/nutrition-client.test.tsx' 'src/app/(protected)/_components/optional-fields.test.tsx' src/app/mobile-ui-contract.test.ts`

Expected: FAIL on old menu/form/history-card contracts.

- [ ] **Step 3: Consolidate settings and data-management styles**

Apply grouped white list cards, shared SVG icon containers, violet disclosure/restore affordances, neutral audit styling and explicit danger treatment. Preserve all download URLs, restore calls, CSRF behavior and logout flow.

- [ ] **Step 4: Consolidate profile and five record-editor styles**

Apply the shared field, optional-section, summary-card, record-history, pending, submit and danger rules. Add presentation class hooks only where existing semantic classes cannot distinguish roles; do not alter form names, payload construction, API routes or validation copy.

- [ ] **Step 5: Run focused, lint, and type checks**

Run the Task 5 Step 2 command, then `npm run lint && npm run typecheck`.

Expected: all commands exit 0.

- [ ] **Step 6: Commit management surfaces**

```bash
git add 'src/app/(protected)/settings' 'src/app/(protected)/children' 'src/app/(protected)/_components/optional-fields.tsx' 'src/app/(protected)/_components/optional-fields.test.tsx' src/app/globals.css src/app/mobile-ui-contract.test.ts
git commit -m "style: unify settings and record editors"
```

### Task 6: Cross-Theme Browser Verification and Release Gate

**Files:**
- Modify: `TASKS.md`
- Modify: `PROGRESS.md`
- Modify: `DECISIONS.md`
- Modify: `README.md` only if screenshots or documented visual behavior are referenced
- Test: existing full suite
- Create outside source control: `/tmp/growlog-modern-ui-smoke.mjs`

**Interfaces:**
- Consumes: all prior tasks.
- Produces: M24 durable status, light/dark browser evidence, final review evidence, a verified commit, and updated `origin/main`.

- [ ] **Step 1: Run the clean automated release gate**

Run sequentially:

```bash
npm run db:test:prepare
DATABASE_URL=postgresql://growlog_test:growlog_test@localhost:55432/growlog_test npm test
npm run lint
npm run typecheck
npm run build
git diff --check
```

Expected: database reset succeeds; all tests pass; lint/typecheck/build/diff check exit 0.

- [ ] **Step 2: Run the complete production browser matrix**

Seed both no-child and populated authenticated households. At 320×568, 390×844, 430×932 and 768×1024, inspect public home, login, no-child Trends, populated Today, Footprints, child detail, all five reports, all five editors with optional fields open, Settings and data management in light and emulated dark modes.

Assert no page-level overflow; fixed navigation does not cover the last control; current navigation is violet and programmatically current; touch/control sizes pass; fields are 16px; cards and menus use the approved surfaces; semantic completion/warning/danger colors remain distinct; charts/tables remain usable. Capture representative 390px screenshots for Today, Footprints, Trends, Settings and one editor in both themes.

- [ ] **Step 3: Request independent whole-change review**

Ask for Critical/Important findings only, with focus on token semantics, dark contrast, stale legacy selectors, icon accessibility, narrow overflow, and accidental business-behavior changes. Fix every verified finding test-first and rerun affected checks.

- [ ] **Step 4: Update durable project records**

Add M24 with its acceptance evidence to `TASKS.md` and `PROGRESS.md`; add an ADR documenting violet brand versus semantic state colors, shared inline SVGs, direct CSS consolidation, and unchanged business/security boundaries.

- [ ] **Step 5: Re-run the final gate after review/documentation changes**

Run the Step 1 sequence again and verify the browser smoke still passes for representative 320/390/768 light/dark pages.

- [ ] **Step 6: Commit and push**

```bash
git add TASKS.md PROGRESS.md DECISIONS.md README.md src docs/superpowers
git commit -m "style: refresh GrowLog mobile interface"
git push origin HEAD:main
git ls-remote --heads origin main
```

Expected: local `HEAD` equals remote `refs/heads/main`, and the working tree is clean.

