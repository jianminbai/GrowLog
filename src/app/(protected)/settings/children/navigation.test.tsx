// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({ useRouter: () => ({}), notFound: () => { throw new Error("NOT_FOUND"); } }));
vi.mock("@/lib/db", () => ({ getPrisma: () => ({}) }));
vi.mock("@/modules/auth/server-session", () => ({ requireServerSession: async () => ({ householdId: "h1" }) }));
vi.mock("@/modules/children/child-repository", () => ({ listChildrenForHousehold: async () => [{ id: "c1", name: "小满" }] }));
import ManageChildrenPage from "./page";
import NewChildPage from "./new/page";
afterEach(cleanup);
describe("settings child management", () => {
  it("offers profile editing and all five record editors", async () => {
    render(await ManageChildrenPage());
    expect(screen.getByRole("link", { name: "基础资料" })).toHaveAttribute("href", "/settings/children/c1/edit");
    for (const domain of ["growth", "sleep", "nutrition", "activity", "emotion"]) {
      expect(document.querySelector(`a[href="/settings/children/c1/records/${domain}"]`)).not.toBeNull();
    }
  });
  it("hosts the create form under settings", async () => {
    render(await NewChildPage());
    expect(screen.getByRole("heading", { name: "添加孩子" })).toBeInTheDocument();
    expect(screen.getByLabelText("姓名")).toBeInTheDocument();
  });
});
