// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const historyEntries = vi.hoisted(() => [
  {
    id: "growth-active", kind: "GROWTH" as const, childId: "child-1", childName: "小满",
    occurredAt: new Date("2026-10-22T01:00:00.000Z"), title: "身高体重",
    detail: "104 cm · 17 kg", href: "/children/child-1/growth", deletedAt: null
  },
  {
    id: "sleep-deleted", kind: "SLEEP" as const, childId: "child-1", childName: "小满",
    occurredAt: new Date("2026-10-21T13:00:00.000Z"), title: "夜间睡眠",
    detail: "540 分钟", href: "/children/child-1/sleep", deletedAt: new Date("2026-10-22T02:00:00.000Z")
  }
]);

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/db", () => ({
  getPrisma: () => ({
    household: { findUnique: vi.fn().mockResolvedValue({ timeZone: "Asia/Shanghai" }) }
  })
}));
vi.mock("@/modules/auth/server-session", () => ({
  requireServerSession: vi.fn().mockResolvedValue({ householdId: "household-1" })
}));
vi.mock("@/modules/history/history-repository", () => ({
  listHistoryEntries: vi.fn().mockResolvedValue(historyEntries),
  listAuditEvents: vi.fn().mockResolvedValue([{
    id: "audit-1", actorId: "parent@example.com", action: "DELETE",
    entityType: "SleepSession", changedFields: ["deletedAt"],
    createdAt: new Date("2026-10-22T02:00:00.000Z")
  }])
}));

afterEach(cleanup);

describe("data management page", () => {
  it("keeps deleted records and redacted audits together outside daily history", async () => {
    const { default: DataManagementPage } = await import("./page");
    render(await DataManagementPage());

    const deleted = screen.getByRole("region", { name: "已删除记录" });
    expect(within(deleted).getByText("夜间睡眠")).toBeInTheDocument();
    expect(within(deleted).getByText(/540 分钟/)).toBeInTheDocument();
    expect(within(deleted).getByRole("button", { name: "恢复夜间睡眠" })).toBeInTheDocument();
    expect(screen.queryByText("104 cm · 17 kg")).not.toBeInTheDocument();

    const audits = screen.getByRole("region", { name: "最近审计事件" });
    expect(within(audits).getByText("删除 SleepSession")).toBeInTheDocument();
    expect(within(audits).getByText("字段：deletedAt")).toBeInTheDocument();
  });
});
