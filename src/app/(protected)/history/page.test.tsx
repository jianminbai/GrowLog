// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const entries = vi.hoisted(() => [
  {
    id: "growth-1", kind: "GROWTH" as const, childId: "child-1", childName: "小满",
    occurredAt: new Date("2026-10-22T01:00:00.000Z"), title: "身高体重",
    detail: "104 cm · 17 kg", href: "/children/child-1/growth", deletedAt: null
  },
  {
    id: "sleep-1", kind: "SLEEP" as const, childId: "child-1", childName: "小满",
    occurredAt: new Date("2026-10-21T13:00:00.000Z"), title: "夜间睡眠",
    detail: "540 分钟", href: "/children/child-1/sleep", deletedAt: null
  },
  {
    id: "activity-1", kind: "ACTIVITY" as const, childId: "child-1", childName: "小满",
    occurredAt: new Date("2026-10-20T02:00:00.000Z"), title: "骑车",
    detail: "30 分钟 · 户外 20 分钟", href: "/children/child-1/activity", deletedAt: null
  }
]);

vi.mock("@/lib/db", () => ({
  getPrisma: () => ({
    household: { findUnique: vi.fn().mockResolvedValue({ timeZone: "Asia/Shanghai" }) }
  })
}));
vi.mock("@/modules/auth/server-session", () => ({
  requireServerSession: vi.fn().mockResolvedValue({ householdId: "household-1" })
}));
vi.mock("@/modules/history/history-repository", () => ({
  listHistoryEntries: vi.fn().mockResolvedValue(entries),
  listAuditEvents: vi.fn().mockResolvedValue([{
    id: "audit-1", actorId: "parent@example.com", action: "UPDATE",
    entityType: "GrowthMeasurement", changedFields: ["heightCm"],
    createdAt: new Date("2026-10-22T01:05:00.000Z")
  }])
}));

import HistoryPage from "./page";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-22T04:00:00.000Z"));
});

describe("history page", () => {
  it("groups complete active-record cards by household-local day", async () => {
    const { container } = render(await HistoryPage());

    expect(screen.getByRole("heading", { level: 1, name: "成长足迹" })).toBeInTheDocument();
    expect(screen.getByLabelText("历史概览")).toHaveTextContent("3 条记录");
    expect(screen.getByLabelText("历史概览")).toHaveTextContent("3 个记录日");

    const today = screen.getByRole("region", { name: "今天" });
    expect(within(today).getByText("身高体重")).toBeInTheDocument();
    expect(within(today).getByText("生长 · 小满 · 104 cm · 17 kg")).toBeInTheDocument();
    expect(within(today).queryByText("09:00")).not.toBeInTheDocument();

    expect(screen.getByRole("region", { name: "昨天" })).toHaveTextContent("夜间睡眠");
    expect(screen.getByRole("region", { name: /10月20日/ })).toHaveTextContent("骑车");
    expect(screen.queryByText("parent@example.com")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /已删除/ })).not.toBeInTheDocument();
    expect(container.querySelector('[data-kind="growth"]')).not.toBeNull();
    expect(container.querySelector(".swipe-history-item")).toBeNull();
    expect(screen.queryByText("右滑编辑")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "前往编辑" })).not.toBeInTheDocument();
  });

  it("places category, child, and value together on the right", async () => {
    render(await HistoryPage());
    const sleepCard = screen.getByText("夜间睡眠").closest("article");
    expect(sleepCard).not.toBeNull();
    expect(within(sleepCard!).getByText("睡眠 · 小满 · 540 分钟")).toHaveClass("history-meta");
  });
});
