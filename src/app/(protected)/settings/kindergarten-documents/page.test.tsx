// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { createElement, type ImgHTMLAttributes } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const children = vi.hoisted(() => [] as Array<{ id: string; name: string }>);
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("next/image", () => ({ default: ({ unoptimized, ...props }: ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean }) => {
  void unoptimized;
  return createElement("img", props);
} }));
vi.mock("@/lib/db", () => ({ getPrisma: () => ({}) }));
vi.mock("@/modules/auth/server-session", () => ({ requireServerSession: async () => ({ householdId: "household-1" }) }));
vi.mock("@/modules/children/child-repository", () => ({ listChildrenForHousehold: async () => children }));

import KindergartenDocumentsPage from "./page";

afterEach(cleanup);
beforeEach(() => {
  children.splice(0);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { documents: [] } }))));
});

describe("kindergarten documents settings page", () => {
  it("offers child creation instead of upload controls when there is no child", async () => {
    render(await KindergartenDocumentsPage());
    expect(screen.getByRole("heading", { name: "幼儿园资料" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "添加孩子" })).toHaveAttribute("href", "/settings/children/new");
    expect(screen.queryByLabelText("选择孩子")).not.toBeInTheDocument();
  });

  it("shows a child selector and separate care-sheet and menu upload regions", async () => {
    children.push({ id: "child-1", name: "小满" }, { id: "child-2", name: "小雨" });
    render(await KindergartenDocumentsPage());
    expect(screen.getByLabelText("选择孩子")).toHaveValue("child-1");
    expect(screen.getByRole("region", { name: "上传每日保教单" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "上传每周菜单" })).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("/data/uploads");
  });
});
