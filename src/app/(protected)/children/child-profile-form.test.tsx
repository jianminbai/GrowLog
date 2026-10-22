// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ChildProfileForm } from "./child-profile-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() })
}));

describe("ChildProfileForm", () => {
  it("groups profile fields without changing their form names", () => {
    render(<ChildProfileForm />);

    const basic = screen.getByRole("group", { name: "基本信息" });
    const birth = screen.getByRole("group", { name: "出生信息" });
    const family = screen.getByRole("group", { name: "家庭信息" });
    const notes = screen.getByRole("group", { name: "备注" });

    expect(within(basic).getByLabelText("姓名")).toHaveAttribute("name", "name");
    expect(within(basic).getByLabelText("出生日期")).toHaveAttribute("name", "birthDate");
    expect(within(birth).getByLabelText("出生身高（cm）")).toHaveAttribute("name", "birthHeightCm");
    expect(within(family).getByLabelText("母亲身高（cm）")).toHaveAttribute("name", "motherHeightCm");
    expect(within(notes).getByLabelText("补充备注")).toHaveAttribute("name", "notes");
  });
});
