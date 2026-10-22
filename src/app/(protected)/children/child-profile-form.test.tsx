// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ChildProfileForm } from "./child-profile-form";

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => router }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

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

  it("returns to the profile detail after an edit succeeds", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ data: { child: { id: "child-1" } } })));
    render(<ChildProfileForm child={{
      id: "child-1", name: "小满", birthDate: "2022-05-18", sex: "FEMALE",
      birthHeightCm: 50, birthWeightKg: 3.2, motherHeightCm: 165, fatherHeightCm: 178,
      notes: null, createdAt: "2026-10-20T08:00:00.000Z", updatedAt: "2026-10-20T08:00:00.000Z"
    }} />);

    fireEvent.submit(screen.getByRole("button", { name: "保存修改" }).closest("form")!);

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/children/child-1"));
  });
});
