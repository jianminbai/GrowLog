// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ children: [] as { id: string; name: string; birthDate: string }[] }));
vi.mock("@/lib/db", () => ({ getPrisma: () => ({}) }));
vi.mock("@/modules/auth/server-session", () => ({ requireServerSession: async () => ({ householdId: "h1" }) }));
vi.mock("@/modules/children/child-repository", () => ({ listChildrenForHousehold: async () => state.children }));
vi.mock("@/modules/children/child-handlers", () => ({ serializeChild: (child: unknown) => child }));
vi.mock("next/navigation", () => ({ useRouter: () => ({}) }));
import ChildrenPage from "./page";
afterEach(cleanup);
describe("view-only children list", () => {
  it("offers an add-child link without a form when empty", async () => {
    state.children = [];
    const { container } = render(await ChildrenPage());
    expect(screen.getByRole("link", { name: "添加孩子" })).toHaveAttribute("href", "/settings/children/new");
    expect(container.querySelector("form")).toBeNull();
  });
  it("shows existing children without the creation form", async () => {
    state.children = [{ id: "c1", name: "小满", birthDate: "2022-05-18" }];
    const { container } = render(await ChildrenPage());
    expect(screen.getByRole("heading", { name: "成长趋势" })).toBeInTheDocument();
    expect(screen.getByText("选择孩子，查看身高体重、睡眠、饮食、活动和情绪记录。")).toBeInTheDocument();
    expect(screen.queryByText(/基础资料只需填写一次/)).not.toBeInTheDocument();
    const childLink = screen.getByRole("link", { name: /小满/ });
    expect(childLink).toHaveAttribute("href", "/children/c1");
    expect(childLink.querySelector('[data-icon="child"]')).toBeInTheDocument();
    expect(childLink.querySelector('[data-icon="chevron"]')).toBeInTheDocument();
    expect(screen.getByText("查看成长趋势")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "添加孩子" })).not.toBeInTheDocument();
    expect(container.querySelector("form")).toBeNull();
  });
});
