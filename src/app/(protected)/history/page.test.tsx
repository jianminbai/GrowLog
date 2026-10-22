// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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
    render(await HistoryPage());

    const today = screen.getByRole("region", { name: "今天" });
    expect(within(today).getByText("生长 · 小满")).toBeInTheDocument();
    expect(within(today).getByText("身高体重")).toBeInTheDocument();
    expect(within(today).getByText("104 cm · 17 kg")).toBeInTheDocument();
    expect(within(today).getByText("09:00")).toBeInTheDocument();

    expect(screen.getByRole("region", { name: "昨天" })).toHaveTextContent("夜间睡眠");
    expect(screen.getByRole("region", { name: /10月20日/ })).toHaveTextContent("骑车");
    expect(screen.queryByText("parent@example.com")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /已删除/ })).not.toBeInTheDocument();
  });

  it("reveals the edit entry after a deliberate right swipe", async () => {
    render(await HistoryPage());

    const card = screen.getByRole("group", { name: "身高体重" });
    expect(within(card).queryByRole("link", { name: "前往编辑" })).not.toBeInTheDocument();

    fireEvent.pointerDown(card, { clientX: 12, clientY: 30, pointerId: 1 });
    fireEvent.pointerMove(card, { clientX: 84, clientY: 34, pointerId: 1 });
    fireEvent.pointerUp(card, { clientX: 84, clientY: 34, pointerId: 1 });

    expect(within(card).getByRole("link", { name: "前往编辑" })).toHaveAttribute(
      "href",
      "/children/child-1/growth"
    );
  });

  it("keeps the revealed edit link actionable by touch and keyboard", async () => {
    render(await HistoryPage());
    const card = screen.getByRole("group", { name: "身高体重" });
    fireEvent.keyDown(card, { key: "Enter" });
    const link = within(card).getByRole("link", { name: "前往编辑" });

    fireEvent.pointerDown(link, { clientX: 84, clientY: 30, pointerId: 1 });
    fireEvent.pointerUp(link, { clientX: 84, clientY: 30, pointerId: 1 });
    expect(link).toBeInTheDocument();
    expect(fireEvent.keyDown(link, { key: "Enter" })).toBe(true);
  });

  it("does not reveal editing after the browser cancels a gesture", async () => {
    render(await HistoryPage());
    const card = screen.getByRole("group", { name: "身高体重" });

    fireEvent.pointerDown(card, { clientX: 12, clientY: 30, pointerId: 1 });
    fireEvent.pointerMove(card, { clientX: 84, clientY: 34, pointerId: 1 });
    fireEvent.pointerCancel(card, { pointerId: 1 });

    expect(within(card).queryByRole("link", { name: "前往编辑" })).not.toBeInTheDocument();
  });
});
