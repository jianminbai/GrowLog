// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const child = {
  id: "child-1",
  name: "小满",
  birthDate: "2022-05-18",
  sex: "FEMALE" as const,
  birthHeightCm: 50,
  birthWeightKg: 3.2,
  motherHeightCm: 165,
  fatherHeightCm: 178,
  notes: "容易晕车",
  createdAt: "2026-10-20T08:00:00.000Z",
  updatedAt: "2026-10-20T08:00:00.000Z"
};

vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
  usePathname: () => "/children/child-1",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() })
}));
vi.mock("@/lib/db", () => ({ getPrisma: () => ({}) }));
vi.mock("@/modules/auth/server-session", () => ({
  requireServerSession: vi.fn().mockResolvedValue({ householdId: "household-1" })
}));
vi.mock("@/modules/children/child-repository", () => ({
  findChildForHousehold: vi.fn().mockResolvedValue({ id: "child-1" })
}));
vi.mock("@/modules/children/child-handlers", () => ({ serializeChild: () => child }));

import ChildPage from "./page";

describe("child profile detail", () => {
  it("shows a compact summary and keeps the edit form off the default page", async () => {
    render(await ChildPage({ params: Promise.resolve({ childId: "child-1" }) }));

    expect(screen.getByRole("heading", { name: "基础资料" })).toBeInTheDocument();
    expect(screen.getByText("女")).toBeInTheDocument();
    expect(screen.getByText("3.2 kg")).toBeInTheDocument();
    expect(screen.queryByLabelText("姓名")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "保存修改" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "编辑基础资料" })).toHaveAttribute(
      "href",
      "/children/child-1/edit"
    );
  });
});
