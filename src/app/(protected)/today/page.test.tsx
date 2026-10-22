// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const listGrowthForChild = vi.hoisted(() => vi.fn(async () => [{ measuredAt: new Date("2026-10-01T00:00:00Z"), heightCm: 100, weightKg: 15 }]));

vi.mock("@/modules/auth/server-session", () => ({ requireServerSession: async () => ({ householdId: "h1" }) }));
vi.mock("@/lib/db", () => ({ getPrisma: () => ({ household: { findUnique: async () => ({ timeZone: "Asia/Shanghai" }) } }) }));
vi.mock("@/modules/children/child-repository", () => ({ listChildrenForHousehold: async () => [{ id: "c1", name: "小满" }] }));
vi.mock("@/modules/growth/growth-repository", () => ({ listGrowthForChild }));
vi.mock("@/modules/sleep/sleep-repository", () => ({ listSleepForChild: async () => [{ kind: "NIGHT", startedAt: new Date("2026-10-19T16:00:00Z"), endedAt: new Date("2026-10-20T00:00:00Z"), awakeMinutes: 0 }] }));
vi.mock("@/modules/nutrition/nutrition-repository", () => ({
  listMealsForChild: async () => [{ occurredAt: new Date("2026-10-20T01:00:00Z"), items: [{ deletedAt: null }] }],
  listBeveragesForChild: async () => [
    { occurredAt: new Date("2026-10-20T02:00:00Z"), type: "MILK", volumeMl: 180 },
    { occurredAt: new Date("2026-10-20T03:00:00Z"), type: "WATER", volumeMl: 60 }
  ]
}));
vi.mock("@/modules/activity/activity-repository", () => ({ listActivitiesForChild: async () => [{ occurredAt: new Date("2026-10-20T04:00:00Z"), durationMinutes: 45, outdoorMinutes: null, intensity: "LIGHT" }] }));
vi.mock("@/modules/emotion/emotion-repository", () => ({ listEmotionsForChild: async () => [{ occurredAt: new Date("2026-10-20T05:00:00Z"), mood: "CALM", tags: [] }] }));

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

    expect(screen.getByRole("heading", { name: "今日概览" })).toBeInTheDocument();
    expect(screen.getByText("480 分钟")).toBeInTheDocument();
    expect(screen.getByText("1 餐 · 1 项食物")).toBeInTheDocument();
    expect(screen.getByText("180 ml · 60 ml")).toBeInTheDocument();
    expect(screen.getByText("45 分钟 · 户外 未记录")).toBeInTheDocument();
    expect(screen.getByText("1 条活动未填户外时长")).toBeInTheDocument();
    expect(screen.getByText("🙂 平静")).toBeInTheDocument();
    expect(screen.queryByText("最近数据")).not.toBeInTheDocument();
    expect(screen.queryByText("最近身高体重")).not.toBeInTheDocument();
    expect(screen.queryByText("最近记录")).not.toBeInTheDocument();
    expect(listGrowthForChild).not.toHaveBeenCalled();
  });
});
