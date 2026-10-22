// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() })
}));
vi.mock("@/lib/db", () => ({ getPrisma: () => ({}) }));
vi.mock("@/modules/auth/server-session", () => ({
  requireServerSession: vi.fn().mockResolvedValue({ householdId: "household-1" })
}));
vi.mock("@/modules/children/child-repository", () => ({
  findChildForHousehold: vi.fn().mockResolvedValue({ id: "child-1" })
}));
vi.mock("@/modules/children/child-handlers", () => ({
  serializeChild: () => ({
    id: "child-1",
    name: "小满",
    birthDate: "2022-05-18",
    sex: "FEMALE",
    birthHeightCm: 50,
    birthWeightKg: 3.2,
    motherHeightCm: 165,
    fatherHeightCm: 178,
    notes: null,
    createdAt: "2026-10-20T08:00:00.000Z",
    updatedAt: "2026-10-20T08:00:00.000Z"
  })
}));

import EditChildPage from "./page";

describe("child profile edit page", () => {
  it("keeps the existing form on a dedicated low-frequency route", async () => {
    render(await EditChildPage({ params: Promise.resolve({ childId: "child-1" }) }));

    expect(screen.getByRole("heading", { name: "编辑基础资料" })).toBeInTheDocument();
    expect(screen.getByLabelText("姓名")).toHaveValue("小满");
    expect(screen.getByRole("link", { name: "← 返回小满档案" })).toHaveAttribute(
      "href",
      "/children/child-1"
    );
  });
});
