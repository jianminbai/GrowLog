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

  it("disables nonessential motion when the user requests it", () => {
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  });
});
