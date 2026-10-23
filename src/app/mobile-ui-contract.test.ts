import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8");

function tokenValue(block: string, token: string) {
  const match = block.match(new RegExp(`${token}:\\s*(#[0-9a-f]{6})`, "i"));
  if (!match?.[1]) throw new Error(`Missing ${token}`);
  return match[1];
}

function relativeLuminance(hex: string) {
  const channels = hex.slice(1).match(/.{2}/g)!.map((channel) => {
    const value = Number.parseInt(channel, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const [red, green, blue] = channels;
  if (red === undefined || green === undefined || blue === undefined) throw new Error(`Invalid color: ${hex}`);
  return (0.2126 * red) + (0.7152 * green) + (0.0722 * blue);
}

function contrastRatio(first: string, second: string) {
  const lighter = Math.max(relativeLuminance(first), relativeLuminance(second));
  const darker = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (lighter + 0.05) / (darker + 0.05);
}

describe("mobile UI CSS contract", () => {
  it("uses the approved modern light and dark visual tokens", () => {
    const rootBlocks = [...css.matchAll(/:root\s*\{([^}]+)\}/g)].map((match) => match[1]!);
    expect(rootBlocks).toHaveLength(2);

    const [light, dark] = rootBlocks;
    expect(light).toContain("--canvas: #f7f7fa");
    expect(light).toContain("--surface: #ffffff");
    expect(light).toContain("--surface-muted: #f3f0f6");
    expect(light).toContain("--ink: #211d26");
    expect(light).toContain("--muted: #77717d");
    expect(light).toContain("--line: #e9e6ed");
    expect(light).toContain("--brand-violet: #76558f");
    expect(light).toContain("--brand-violet-strong: #5e3f76");
    expect(light).toContain("--success-bg: #e9f5f0");
    expect(light).toContain("--success-ink: #256a52");
    expect(light).toContain("--warning-bg: #fff1e7");
    expect(light).toContain("--warning-ink: #7a3b15");
    expect(light).toContain("--danger-bg: #fdecec");
    expect(light).toContain("--danger-ink: #963a3a");
    expect(light).toContain("--brand-subtle: #f1eaf5");
    expect(light).toContain("--brand-subtle-ink: #5e3f76");

    expect(dark).toContain("--success-bg: #1e3b32");
    expect(dark).toContain("--success-ink: #a8dcc8");
    expect(dark).toContain("--warning-bg: #412b1d");
    expect(dark).toContain("--warning-ink: #ffc49b");
    expect(dark).toContain("--danger-bg: #452628");
    expect(dark).toContain("--danger-ink: #ffb3b3");
    expect(dark).toContain("--brand-subtle: #30273a");
    expect(dark).toContain("--brand-subtle-ink: #d8c0e8");

    expect(css).not.toContain("--brand-green");
    expect(css).not.toContain("--green");
  });

  it("keeps every semantic foreground and background pair at AA contrast", () => {
    const rootBlocks = [...css.matchAll(/:root\s*\{([^}]+)\}/g)].map((match) => match[1]!);
    const pairs = [
      ["--success-bg", "--success-ink"],
      ["--warning-bg", "--warning-ink"],
      ["--danger-bg", "--danger-ink"],
      ["--brand-subtle", "--brand-subtle-ink"],
    ] as const;

    rootBlocks.forEach((block) => {
      pairs.forEach(([backgroundToken, foregroundToken]) => {
        expect(contrastRatio(tokenValue(block, backgroundToken), tokenValue(block, foregroundToken))).toBeGreaterThanOrEqual(4.5);
      });
    });
  });

  it("defines touch and input sizes that are safe on phones", () => {
    expect(css).toMatch(/--tap-min:\s*44px/);
    expect(css).toMatch(/--control-min:\s*48px/);
    expect(css).toMatch(/\.profile-form input,[\s\S]*font-size:\s*16px/);
  });

  it("accounts for the mobile safe area and desktop navigation breakpoint", () => {
    expect(css).toContain("env(safe-area-inset-bottom)");
    expect(css).toMatch(/@media\s*\(min-width:\s*760px\)/);
  });

  it("keeps narrow viewport widths valid with explicit calc expressions", () => {
    expect(css).not.toMatch(/min\(100%\s*-/);
    expect(css).toContain("min(calc(100% - 2rem), 70rem)");
    expect(css).toMatch(/\.dashboard-children\s*>\s*\*\s*\{\s*min-width:\s*0/);
    expect(css).toMatch(/\.profile-summary-notes dd\s*\{[^}]*white-space:\s*pre-wrap/);
  });

  it("gives completion and notice surfaces explicit dark-mode-safe pairs", () => {
    expect(css).toMatch(/\.completion-item\.done\s*\{[^}]*color:\s*var\(--success-ink\)/);
    expect(css).toMatch(/\.completion-item\.missing\s*\{[^}]*color:\s*var\(--warning-ink\)/);
    expect(css).toMatch(/\.trend-notices\s*\{[^}]*background:\s*var\(--brand-subtle\)[^}]*color:\s*var\(--brand-subtle-ink\)/);
    expect(css).toMatch(/\.trend-notices li\s*\{[^}]*color:\s*inherit/);
  });

  it("keeps secondary and restore actions touch sized", () => {
    expect(css).toMatch(/\.secondary-download\s*\{[^}]*min-height:\s*var\(--tap-min\)/);
    expect(css).toMatch(/\.restore-action\s*\{[^}]*min-height:\s*var\(--tap-min\)/);
  });

  it("keeps history rows compact without swipe editing controls", () => {
    expect(css).toMatch(/\.history-entry\s*\{[^}]*gap:\s*0\.35rem[^}]*padding:\s*0\.55rem 0\.75rem/);
    expect(css).toMatch(/\.history-meta\s*\{[^}]*text-align:\s*right/);
    expect(css).not.toContain(".swipe-edit-slot");
    expect(css).not.toContain(".history-swipe-hint");
  });

  it("keeps deleted-record recovery readable and touch safe on phones", () => {
    expect(css).toMatch(/\.deleted-management-entry\s*\{[^}]*display:\s*grid[^}]*padding:\s*0\.75rem/);
    expect(css).toMatch(/\.restore-control\s*\{[^}]*display:\s*grid/);
  });

  it("disables nonessential motion when the user requests it", () => {
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*\.report-line[^}]*stroke-dashoffset:\s*0/);
  });

  it("keeps dense chart points selectable and long history content readable", () => {
    expect(css).toMatch(/\.chart-point-control\s*\{[^}]*pointer-events:\s*none/);
    expect(css).toMatch(/\.history-meta\s*\{[^}]*min-width:\s*0[^}]*overflow-wrap:\s*anywhere/);
  });

  it("uses compact touch-safe settings menus and measurement details", () => {
    expect(css).toMatch(/\.settings-menu-list\s*\{[^}]*display:\s*grid/);
    expect(css).toMatch(/\.settings-menu-item\s*\{[^}]*min-height:\s*var\(--control-min\)/);
    expect(css).toMatch(/\.measurement-detail summary\s*\{[^}]*min-height:\s*var\(--tap-min\)/);
    expect(css).toMatch(/\.report-table th\s*\{[^}]*position:\s*sticky/);
    expect(css).toMatch(/\.measurement-date\s*\{[^}]*white-space:\s*nowrap/);
  });

  it("centers compact growth-measurement rows on one visual line", () => {
    expect(css).toMatch(/\.measurement-table th,\s*\.measurement-table td\s*\{[^}]*padding:\s*0\.25rem 0\.55rem[^}]*vertical-align:\s*middle[^}]*text-align:\s*center[^}]*white-space:\s*nowrap/);
    expect(css).toMatch(/\.measurement-table \.measurement-detail\s*\{[^}]*margin:\s*0 auto/);
    expect(css).toMatch(/\.measurement-table \.measurement-detail summary\s*\{[^}]*justify-content:\s*center/);
  });

  it("uses full-width Today cards with four compact comparison columns", () => {
    expect(css).toMatch(/\.today-overview-grid\s*\{[^}]*grid-template-columns:\s*1fr/);
    expect(css).toMatch(/\.today-period-grid\s*\{[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/);
  });

  it("uses violet for brand actions while preserving green, orange, and red semantics", () => {
    expect([...css.matchAll(/--brand-violet:/g)]).toHaveLength(2);
    expect([...css.matchAll(/--success-green:/g)]).toHaveLength(2);
    expect([...css.matchAll(/--warning-orange:/g)]).toHaveLength(2);
    expect([...css.matchAll(/--danger-red:/g)]).toHaveLength(2);
    expect(css).toMatch(/\.primary-action\s*\{[^}]*background:\s*var\(--brand-violet\)/);
    expect(css).toMatch(/\.primary-action:focus-visible,[\s\S]*outline:\s*3px solid var\(--brand-violet\)/);
    expect(css).toMatch(/\.danger-action,[\s\S]*color:\s*var\(--danger-ink\)/);
    expect(css).toMatch(/\.today-period strong\s*\{[^}]*color:\s*var\(--brand-violet-strong\)/);
    expect(css).toMatch(/\.completion-item\.done\s*\{[^}]*background:\s*var\(--success-bg\)[^}]*color:\s*var\(--success-ink\)/);
    expect(css).toMatch(/\.completion-item\.missing\s*\{[^}]*background:\s*var\(--warning-bg\)[^}]*color:\s*var\(--warning-ink\)/);
    expect(css).toMatch(/\.history-kind-emotion\s*\{[^}]*--history-accent:\s*var\(--warning-orange\)/);
  });

  it("uses neutral surfaces and system sans typography without legacy gradients", () => {
    expect(css).toMatch(/body\s*\{[^}]*background:\s*var\(--canvas\)/);
    expect(css).not.toContain("Georgia");
    expect(css).not.toContain("radial-gradient");
    expect(css).toMatch(/\.wordmark\s*\{[^}]*font-family:\s*inherit/);
  });

  it("gives the public shell, login, and navigation a shared modern surface hierarchy", () => {
    expect(css).toMatch(/\.hero\s*\{[^}]*padding-top:\s*clamp\(2rem,[^}]*\}/);
    expect(css).toMatch(/\.preview\s*\{[^}]*border-radius:\s*1\.5rem[^}]*background:\s*var\(--surface\)[^}]*box-shadow:\s*0 8px 24px/);
    expect(css).toMatch(/\.login-panel\s*\{[^}]*border-radius:\s*1\.5rem[^}]*background:\s*var\(--surface\)[^}]*box-shadow:\s*0 8px 24px/);
    expect(css).toMatch(/\.form-message\s*\{[^}]*overflow-wrap:\s*anywhere/);
    expect(css).toMatch(/\.app-brand\s*\{[^}]*font-family:\s*inherit[^}]*letter-spacing:\s*-0\.02em/);
    expect(css).toMatch(/\.mobile-app-nav\s*\{[^}]*background:\s*color-mix\(in srgb, var\(--surface\) 96%, transparent\)/);
    expect(css).toMatch(/\.mobile-app-nav a\s*\{[^}]*min-height:\s*3\.25rem/);
    expect(css).toMatch(/\.mobile-app-nav a\.is-current\s*\{[^}]*background:\s*var\(--brand-subtle\)[^}]*color:\s*var\(--brand-subtle-ink\)/);
    expect(css).toMatch(/\.desktop-app-nav \.app-nav-links a\.is-current\s*\{[^}]*background:\s*var\(--brand-subtle\)[^}]*color:\s*var\(--brand-subtle-ink\)/);
  });

  it("uses the modern card and chart system across Today, Footprints, and Trends", () => {
    expect(css).toMatch(/\.dashboard-card\s*\{[^}]*border-radius:\s*1\.5rem[^}]*background:\s*var\(--surface\)[^}]*box-shadow:\s*0 8px 24px/);
    expect(css).toMatch(/\.completion-item\s*\{[^}]*border:\s*1px solid var\(--line\)/);
    expect(css).toMatch(/\.quick-actions a\s*\{[^}]*background:\s*var\(--brand-subtle\)[^}]*color:\s*var\(--brand-subtle-ink\)/);
    expect(css).toMatch(/\.history-entry\s*\{[^}]*background:\s*var\(--surface\)[^}]*box-shadow:\s*0 4px 16px rgba\(44, 34, 52, 0\.04\)/);
    expect(css).toMatch(/\.profile-card\s*\{[^}]*grid-template-columns:\s*2\.5rem minmax\(0, 1fr\) auto[^}]*background:\s*var\(--surface\)/);
    expect(css).toMatch(/\.domain-links a\s*\{[^}]*background:\s*var\(--surface\)[^}]*box-shadow:\s*0 4px 16px/);
    expect(css).toMatch(/\.report-chart\s*\{[^}]*border-radius:\s*1\.25rem[^}]*background:\s*var\(--surface\)/);
    expect(css).toMatch(/\.report-line\s*\{[^}]*stroke:\s*var\(--brand-violet\)/);
    expect(css).toMatch(/\.chart-point-control:focus-visible\s*\{[^}]*outline:\s*3px solid var\(--brand-violet\)/);
    expect(css).toMatch(/\.report-table th\s*\{[^}]*background:\s*var\(--surface-muted\)/);
  });

  it("makes record cards visibly expandable before destructive actions appear", () => {
    expect(css).toMatch(/\.record-card\s*>\s*summary::after\s*\{[^}]*content:\s*"›"/);
    expect(css).toMatch(/\.record-card\[open\]\s*>\s*summary::after\s*\{[^}]*transform:\s*rotate\(90deg\)/);
  });
});
