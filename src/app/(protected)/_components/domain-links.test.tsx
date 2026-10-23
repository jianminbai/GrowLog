// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DomainLinks } from "./domain-links";

describe("DomainLinks", () => {
  it("links every record domain for the selected child", () => {
    render(<DomainLinks childId="child-42" />);
    const navigation = screen.getByRole("navigation", { name: "小朋友的记录分类" });
    const destinations = [
      ["身高体重", "/children/child-42/growth"],
      ["睡眠", "/children/child-42/sleep"],
      ["饮食奶水", "/children/child-42/nutrition"],
      ["运动户外", "/children/child-42/activity"],
      ["情绪观察", "/children/child-42/emotion"]
    ];

    for (const [label, href] of destinations) {
      expect(within(navigation).getByRole("link", { name: label })).toHaveAttribute("href", href);
    }

    expect(navigation.querySelectorAll("svg.app-icon")).toHaveLength(5);
    for (const name of ["growth", "sleep", "nutrition", "activity", "emotion"]) {
      expect(navigation.querySelector(`[data-icon="${name}"]`)).toBeInTheDocument();
    }
    for (const symbol of ["↗", "☾", "◌", "◇", "☺"]) {
      expect(within(navigation).queryByText(symbol)).not.toBeInTheDocument();
    }
  });
});
