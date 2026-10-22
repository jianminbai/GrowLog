// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ allowed: true }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); }, useRouter: () => ({}) }));
vi.mock("@/modules/auth/server-session", () => ({ requireServerSession: async () => ({ householdId: "h1" }) }));
vi.mock("@/lib/db", () => ({ getPrisma: () => ({}) }));
vi.mock("@/modules/children/child-repository", () => ({ findChildForHousehold: async (_db: unknown, h: string, id: string) => state.allowed && h === "h1" && id === "c1" ? { id, name: "小满" } : null }));
vi.mock("@/modules/sleep/sleep-repository", () => ({ getHouseholdTimeZone: async () => "Asia/Shanghai", listSleepForChild: async () => [] }));
vi.mock("@/modules/growth/growth-repository", () => ({ listGrowthForChild: async () => [{
  id: "g0", childId: "c1", measuredAt: new Date("2025-10-20T01:00:00Z"), heightCm: 100, weightKg: 15,
  headCircumferenceCm: null, source: "HOME", place: null, method: null, device: null,
  precisionNote: null, notes: null, deletedAt: null, createdAt: new Date(), updatedAt: new Date()
}, {
  id: "g1", childId: "c1", measuredAt: new Date("2026-10-20T01:00:00Z"), heightCm: 104, weightKg: 17,
  headCircumferenceCm: 50, source: "HOME", place: "家中", method: "站立测量", device: "儿童身高尺",
  precisionNote: null, notes: "早晨测量", deletedAt: null, createdAt: new Date(), updatedAt: new Date()
}] }));
vi.mock("@/modules/activity/activity-repository", () => ({ listActivitiesForChild: async () => [], getActivityHouseholdTimeZone: async () => "Asia/Shanghai" }));
vi.mock("@/modules/emotion/emotion-repository", () => ({ listEmotionsForChild: async () => [], getEmotionHouseholdTimeZone: async () => "Asia/Shanghai" }));
vi.mock("@/modules/nutrition/nutrition-repository", () => ({ listMealsForChild: async () => [], listBeveragesForChild: async () => [{ id: "b1", type: "YOGURT_DRINK", volumeMl: 120, occurredAt: new Date("2026-10-20T01:00:00Z"), source: "HOME", notes: null, deletedAt: null }] }));
import RecordEditorPage from "../settings/children/[childId]/records/[domain]/page";
import GrowthPage from "../children/[childId]/growth/page";
import SleepPage from "../children/[childId]/sleep/page";
import NutritionPage from "../children/[childId]/nutrition/page";
import ActivityPage from "../children/[childId]/activity/page";
import EmotionPage from "../children/[childId]/emotion/page";
afterEach(() => { cleanup(); state.allowed = true; });
describe("read-only child reports", () => {
  it.each([
    ["身高", GrowthPage], ["睡眠", SleepPage], ["饮食", NutritionPage], ["运动", ActivityPage], ["情绪", EmotionPage]
  ] as const)("%s shows a table without creation or edit controls", async (_label, Page) => {
    const { container } = render(await Page({ params: Promise.resolve({ childId: "c1" }) }));
    expect(screen.getAllByRole("table").length).toBeGreaterThan(0);
    expect(container.querySelector("form")).toBeNull();
    expect(screen.queryByRole("button", { name: /添加|保存|删除/ })).not.toBeInTheDocument();
  });
  it("shows independent height/weight time charts and original measurements", async () => {
    render(await GrowthPage({ params: Promise.resolve({ childId: "c1" }) }));
    expect(screen.getByRole("img", { name: /身高趋势/ })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /体重趋势/ })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "104" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "17" })).toBeInTheDocument();
    expect(screen.getByText(/早晨测量/)).toBeInTheDocument();
    expect(screen.getAllByRole("columnheader").map(header => header.textContent)).toEqual([
      "测量时间", "身高（cm）", "年化身高增长（cm/年）", "体重（kg）", "BMI（kg/m²）",
      "身高变化（cm）", "体重变化（kg）", "来源", "详情"
    ]);
    expect(screen.queryByRole("columnheader", { name: "头围（cm）" })).not.toBeInTheDocument();
    const latestRow = screen.getByRole("row", { name: /2026.*10.*20.*104.*17/ });
    expect(within(latestRow).getAllByRole("cell")[2]).toHaveTextContent("4");
    expect(within(latestRow).getByText("查看详情")).toBeInTheDocument();
    expect(within(latestRow).getByText(/家中.*站立测量.*儿童身高尺.*早晨测量/)).toBeInTheDocument();
  });
  it("includes yogurt drinks in the nutrition chart and table", async () => {
    render(await NutritionPage({ params: Promise.resolve({ childId: "c1" }) }));
    expect(screen.getByRole("img", { name: /每日酸奶饮品量/ })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "酸奶饮品" })).toBeInTheDocument();
  });
  it.each(["growth", "sleep", "nutrition", "activity", "emotion"])("keeps %s entry and editing available under settings", async (domain) => {
    const { container } = render(await RecordEditorPage({ params: Promise.resolve({ childId: "c1", domain }) }));
    expect(container.querySelector("form")).not.toBeNull();
    expect(screen.getByRole("link", { name: "← 返回儿童与记录管理" })).toHaveAttribute("href", "/settings/children");
  });
  it("rejects an unknown editor instead of selecting an inherited object property", async () => {
    await expect(RecordEditorPage({ params: Promise.resolve({ childId: "c1", domain: "toString" }) })).rejects.toThrow("NOT_FOUND");
  });
  it("rejects a child outside the session household", async () => {
    state.allowed = false;
    await expect(GrowthPage({ params: Promise.resolve({ childId: "c1" }) })).rejects.toThrow("NOT_FOUND");
  });
});
