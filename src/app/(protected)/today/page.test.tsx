// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const listGrowthForChild = vi.hoisted(() => vi.fn(async () => [{ measuredAt: new Date("2026-10-01T00:00:00Z"), heightCm: 100, weightKg: 15 }]));
const listMealsForChild = vi.hoisted(() => vi.fn(async () => [
  { occurredAt: new Date("2026-10-20T01:00:00Z"), items: [{ deletedAt: null }] },
  { occurredAt: new Date("2026-10-19T01:00:00Z"), items: [{ deletedAt: null }] },
  { occurredAt: new Date("2026-10-18T01:00:00Z"), items: [{ deletedAt: null }] },
  { occurredAt: new Date("2026-10-18T04:00:00Z"), items: [{ deletedAt: null }, { deletedAt: null }] }
]));

vi.mock("@/modules/auth/server-session", () => ({ requireServerSession: async () => ({ householdId: "h1" }) }));
vi.mock("@/lib/db", () => ({ getPrisma: () => ({ household: { findUnique: async () => ({ timeZone: "Asia/Shanghai" }) } }) }));
vi.mock("@/modules/children/child-repository", () => ({ listChildrenForHousehold: async () => [{ id: "c1", name: "小满" }] }));
vi.mock("@/modules/growth/growth-repository", () => ({ listGrowthForChild }));
vi.mock("@/modules/sleep/sleep-repository", () => ({ listSleepForChild: async () => [
  { kind: "NIGHT", startedAt: new Date("2026-10-19T16:00:00Z"), endedAt: new Date("2026-10-20T00:00:00Z"), awakeMinutes: 0 },
  { kind: "NIGHT", startedAt: new Date("2026-10-18T16:00:00Z"), endedAt: new Date("2026-10-19T00:00:00Z"), awakeMinutes: 0 },
  { kind: "NIGHT", startedAt: new Date("2026-10-17T17:00:00Z"), endedAt: new Date("2026-10-18T00:00:00Z"), awakeMinutes: 0 }
] }));
vi.mock("@/modules/nutrition/nutrition-repository", () => ({
  listMealsForChild,
  listBeveragesForChild: async () => [
    { occurredAt: new Date("2026-10-20T02:00:00Z"), type: "MILK", volumeMl: 180 },
    { occurredAt: new Date("2026-10-20T03:00:00Z"), type: "WATER", volumeMl: 60 },
    { occurredAt: new Date("2026-10-19T02:00:00Z"), type: "MILK", volumeMl: 100 },
    { occurredAt: new Date("2026-10-18T02:00:00Z"), type: "MILK", volumeMl: 200 },
    { occurredAt: new Date("2026-10-19T03:00:00Z"), type: "WATER", volumeMl: null },
    { occurredAt: new Date("2026-10-18T03:00:00Z"), type: "WATER", volumeMl: 80 }
  ]
}));
vi.mock("@/modules/activity/activity-repository", () => ({ listActivitiesForChild: async () => [
  { occurredAt: new Date("2026-10-20T04:00:00Z"), durationMinutes: 45, outdoorMinutes: null, intensity: "LIGHT" },
  { occurredAt: new Date("2026-10-19T04:00:00Z"), durationMinutes: 30, outdoorMinutes: 20, intensity: "LIGHT" },
  { occurredAt: new Date("2026-10-18T04:00:00Z"), durationMinutes: 60, outdoorMinutes: 40, intensity: "MODERATE" }
] }));
vi.mock("@/modules/emotion/emotion-repository", () => ({ listEmotionsForChild: async () => [
  { occurredAt: new Date("2026-10-20T05:00:00Z"), mood: "CALM", tags: [] },
  { occurredAt: new Date("2026-10-19T05:00:00Z"), mood: "CALM", tags: [] },
  { occurredAt: new Date("2026-10-18T05:00:00Z"), mood: "CALM", tags: [] },
  { occurredAt: new Date("2026-10-17T05:00:00Z"), mood: "HAPPY", tags: [] }
] }));

import TodayPage from "./page";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-20T06:00:00Z"));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("today dashboard", () => {
  it("shows only household-local today information instead of latest records", async () => {
    render(await TodayPage());

    expect(screen.getByText("查看今天的记录状态，并与近期有记录日对照。")).toBeInTheDocument();
    expect(screen.queryByText(/快速补齐今日记录/)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "今日概览" })).toBeInTheDocument();
    expect(screen.getByText("480分")).toBeInTheDocument();
    expect(screen.getByText("1餐/1项")).toBeInTheDocument();
    expect(screen.getByText("180/60ml")).toBeInTheDocument();
    expect(screen.getByText("45/—分")).toBeInTheDocument();
    expect(screen.getAllByText("平静")).toHaveLength(4);
    expect(screen.getByText("对照为有记录日均，不含今天。")).toBeInTheDocument();
    const sleep = screen.getByLabelText("睡眠对照");
    expect(within(sleep).getAllByText(/今天|7天|2周|1个月/).map(node => node.textContent)).toEqual(["今天", "7天", "2周", "1个月"]);
    expect(within(sleep).getAllByText("450分")).toHaveLength(3);
    expect(screen.queryByText(/过去7天有记录日均/)).not.toBeInTheDocument();
    expect(screen.queryByText("最近数据")).not.toBeInTheDocument();
    expect(screen.queryByText("最近身高体重")).not.toBeInTheDocument();
    expect(screen.queryByText("最近记录")).not.toBeInTheDocument();
    expect(listGrowthForChild).not.toHaveBeenCalled();
  });

  it("does not turn an unrecorded meal into zero when only a beverage exists", async () => {
    listMealsForChild.mockResolvedValueOnce([]);

    render(await TodayPage());

    expect(within(screen.getByLabelText("饮食对照")).getAllByText("—")).toHaveLength(4);
    expect(screen.getByText("180/60ml")).toBeInTheDocument();
  });
});
