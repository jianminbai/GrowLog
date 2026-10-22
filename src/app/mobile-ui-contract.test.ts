import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8");

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
  });

  it("gives completion states their own dark-mode-safe foreground", () => {
    expect(css).toMatch(/--status-done-ink:/);
    expect(css).toMatch(/\.completion-item\.done\s*\{[^}]*color:\s*var\(--status-done-ink\)/);
  });

  it("disables nonessential motion when the user requests it", () => {
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  });
});
