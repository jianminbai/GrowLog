// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppNavigation } from "./app-navigation";

let pathname = "/today";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname
}));

const navItems = ["今天", "足迹", "趋势", "设置"];

afterEach(() => {
  cleanup();
  pathname = "/today";
});

describe("AppNavigation", () => {
  it("renders the four destinations in separate desktop and mobile landmarks", () => {
    render(<AppNavigation />);

    const desktop = screen.getByRole("navigation", { name: "桌面主要导航" });
    const mobile = screen.getByRole("navigation", { name: "手机主要导航" });

    for (const label of navItems) {
      expect(within(desktop).getByRole("link", { name: label })).toBeVisible();
      expect(within(mobile).getByRole("link", { name: label })).toBeVisible();
    }
  });

  it("marks a nested child route as the current profile destination", () => {
    pathname = "/children/child-1/growth";
    render(<AppNavigation />);

    const desktop = screen.getByRole("navigation", { name: "桌面主要导航" });
    const mobile = screen.getByRole("navigation", { name: "手机主要导航" });

    expect(within(desktop).getByRole("link", { name: "趋势" })).toHaveAttribute("aria-current", "page");
    expect(within(mobile).getByRole("link", { name: "趋势" })).toHaveAttribute("aria-current", "page");
    expect(within(mobile).getByRole("link", { name: "今天" })).not.toHaveAttribute("aria-current");
  });
});
