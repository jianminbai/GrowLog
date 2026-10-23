// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppIcon, type AppIconName } from "./app-icon";

const iconNames: AppIconName[] = [
  "today", "history", "trend", "settings", "growth", "sleep", "nutrition", "activity",
  "emotion", "child", "database", "backup", "table", "account", "plus", "chevron"
];

describe("AppIcon", () => {
  it("renders every application icon as one decorative shared SVG", () => {
    const { container } = render(<>{iconNames.map((name) => <AppIcon name={name} key={name} />)}</>);

    expect(container.querySelectorAll("svg")).toHaveLength(iconNames.length);
    for (const name of iconNames) {
      const icon = container.querySelector(`svg[data-icon="${name}"]`);
      expect(icon).toHaveAttribute("aria-hidden", "true");
      expect(icon).toHaveAttribute("viewBox", "0 0 24 24");
      expect(icon).toHaveAttribute("focusable", "false");
    }
  });

  it("forwards a presentation class without changing its decorative semantics", () => {
    const { container } = render(<AppIcon className="custom-icon" name="today" />);
    expect(container.querySelector("svg")).toHaveClass("app-icon", "custom-icon");
  });
});
