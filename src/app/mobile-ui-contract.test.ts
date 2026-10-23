import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8");

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

  it("gives completion states their own dark-mode-safe foreground", () => {
    expect(css).toMatch(/--status-done-ink:/);
    expect(css).toMatch(/\.completion-item\.done\s*\{[^}]*color:\s*var\(--status-done-ink\)/);
    expect(css.match(/--notice-ink:/g)).toHaveLength(2);
    expect(css.match(/--notice-bg:/g)).toHaveLength(2);
    expect(css).toMatch(/\.trend-notices\s*\{[^}]*color:\s*var\(--notice-ink\)/);
    expect(css).toMatch(/\.trend-notices li\s*\{[^}]*color:\s*inherit/);

    const backgrounds = [...css.matchAll(/--notice-bg:\s*(#[0-9a-f]{6})/gi)].map((match) => match[1]!);
    const foregrounds = [...css.matchAll(/--notice-ink:\s*(#[0-9a-f]{6})/gi)].map((match) => match[1]!);
    expect(backgrounds).toHaveLength(2);
    expect(foregrounds).toHaveLength(2);
    backgrounds.forEach((background, index) => {
      expect(contrastRatio(background, foregrounds[index]!)).toBeGreaterThanOrEqual(4.5);
    });
  });

  it("keeps secondary and restore actions touch sized", () => {
    expect(css).toMatch(/\.secondary-download\s*\{[^}]*min-height:\s*var\(--tap-min\)/);
    expect(css).toMatch(/\.restore-action\s*\{[^}]*min-height:\s*var\(--tap-min\)/);
  });

  it("keeps history rows compact while reserving a touch-safe swipe action", () => {
    expect(css).toMatch(/\.swipe-history-item\s*\{[^}]*overflow:\s*hidden[^}]*touch-action:\s*pan-y/);
    expect(css).toMatch(/\.history-entry\s*\{[^}]*gap:\s*0\.35rem[^}]*padding:\s*0\.55rem 0\.75rem/);
    expect(css).toMatch(/\.swipe-edit-slot a\s*\{[^}]*min-width:\s*var\(--tap-min\)[^}]*min-height:\s*var\(--tap-min\)/);
  });

  it("keeps deleted-record recovery readable and touch safe on phones", () => {
    expect(css).toMatch(/\.deleted-management-entry\s*\{[^}]*display:\s*grid[^}]*padding:\s*0\.75rem/);
    expect(css).toMatch(/\.restore-control\s*\{[^}]*display:\s*grid/);
  });

  it("disables nonessential motion when the user requests it", () => {
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*\.report-line[^}]*stroke-dashoffset:\s*0/);
  });

  it("keeps dense chart points selectable and history hints readable", () => {
    expect(css).toMatch(/\.chart-point-control\s*\{[^}]*pointer-events:\s*none/);
    expect(css).toMatch(/\.history-swipe-hint\s*\{[^}]*color:\s*var\(--ink\)\s*!important/);
    expect(css).toMatch(/\.history-copy\s*\{[^}]*min-width:\s*0/);
    expect(css).toMatch(/\.history-copy strong,[\s\S]*overflow-wrap:\s*anywhere/);
  });

  it("uses compact touch-safe settings menus and measurement details", () => {
    expect(css).toMatch(/\.settings-menu-list\s*\{[^}]*display:\s*grid/);
    expect(css).toMatch(/\.settings-menu-item\s*\{[^}]*min-height:\s*var\(--control-min\)/);
    expect(css).toMatch(/\.measurement-detail summary\s*\{[^}]*min-height:\s*var\(--tap-min\)/);
    expect(css).toMatch(/\.report-table th\s*\{[^}]*position:\s*sticky/);
  });

  it("uses green, orange, and red as semantic theme colors", () => {
    expect(css.match(/--brand-green:/g)).toHaveLength(2);
    expect(css.match(/--accent-orange:/g)).toHaveLength(2);
    expect(css.match(/--danger-red:/g)).toHaveLength(2);
    expect(css).toMatch(/\.primary-action\s*\{[^}]*background:\s*var\(--brand-green\)/);
    expect(css).toMatch(/\.danger-action,[\s\S]*color:\s*var\(--danger-red\)/);
    expect(css).toMatch(/\.today-comparison\s*\{[^}]*color:\s*var\(--brand-green\)/);
    expect(css).toMatch(/\.rose\s*\{[^}]*var\(--accent-orange\)/);
    expect(css).toMatch(/\.history-kind-emotion\s*\{[^}]*--history-accent:\s*var\(--accent-orange\)/);
  });

  it("makes record cards visibly expandable before destructive actions appear", () => {
    expect(css).toMatch(/\.record-card\s*>\s*summary::after\s*\{[^}]*content:\s*"›"/);
    expect(css).toMatch(/\.record-card\[open\]\s*>\s*summary::after\s*\{[^}]*transform:\s*rotate\(90deg\)/);
  });
});
