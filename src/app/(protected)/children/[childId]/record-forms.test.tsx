// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ActivityForm } from "./activity/activity-form";
import { EmotionForm } from "./emotion/emotion-form";
import { GrowthForm } from "./growth/growth-form";
import { NutritionClient } from "./nutrition/nutrition-client";
import { SleepForm } from "./sleep/sleep-form";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function optionalDetails(container: HTMLElement) {
  const details = container.querySelector("details.optional-fields");
  expect(details).not.toBeNull();
  return details as HTMLDetailsElement;
}

function expectInside(details: HTMLElement, control: HTMLElement, inside = true) {
  expect(details.contains(control)).toBe(inside);
}

describe("mobile record form field priority", () => {
  it("keeps growth essentials visible and moves low-frequency fields into more information", () => {
    const { container } = render(<GrowthForm childId="child-1" />);
    const details = optionalDetails(container);

    expectInside(details, screen.getByLabelText("测量时间"), false);
    expectInside(details, screen.getByLabelText("身高（cm）"), false);
    expectInside(details, screen.getByLabelText("体重（kg）"), false);
    expectInside(details, screen.getByLabelText("来源"), false);
    expectInside(details, screen.getByLabelText("头围（cm）"));
    expectInside(details, screen.getByLabelText("备注"));
  });

  it("keeps sleep essentials visible and groups observation fields", () => {
    const { container } = render(<SleepForm childId="child-1" />);
    const details = optionalDetails(container);

    expectInside(details, screen.getByLabelText("类型"), false);
    expectInside(details, screen.getByLabelText("开始时间"), false);
    expectInside(details, screen.getByLabelText("结束时间"), false);
    expectInside(details, screen.getByLabelText("清醒分钟"));
    expectInside(details, screen.getByLabelText("观察备注"));
  });

  it("keeps activity essentials visible and groups context fields", () => {
    const { container } = render(<ActivityForm childId="child-1" />);
    const details = optionalDetails(container);

    expectInside(details, screen.getByLabelText("活动类型"), false);
    expectInside(details, screen.getByLabelText("活动总时长（分钟）"), false);
    expectInside(details, screen.getByLabelText("其中户外时长（分钟）"), false);
    expectInside(details, screen.getByLabelText("强度"), false);
    expectInside(details, screen.getByLabelText("组织形式"));
    expectInside(details, screen.getByLabelText("备注"));
  });

  it("keeps emotion essentials visible and groups context fields", () => {
    const { container } = render(<EmotionForm childId="child-1" />);
    const details = optionalDetails(container);

    expectInside(details, screen.getByLabelText("总体情绪"), false);
    expectInside(details, screen.getByLabelText("发生时间"), false);
    expectInside(details, screen.getByLabelText("标签（逗号分隔）"), false);
    expectInside(details, screen.getByLabelText("持续时间（分钟）"));
    expectInside(details, screen.getByLabelText("家长观察备注"));
  });

  it("prioritizes meal and beverage creation fields", () => {
    render(<NutritionClient childId="child-1" meals={[]} beverages={[]} />);
    const mealSection = screen.getByRole("heading", { name: "添加餐食" }).closest("section")!;
    const drinkSection = screen.getByRole("heading", { name: "添加饮品" }).closest("section")!;
    const mealDetails = optionalDetails(mealSection);
    const drinkDetails = optionalDetails(drinkSection);

    expectInside(mealDetails, within(mealSection).getByLabelText("餐次"), false);
    expectInside(mealDetails, within(mealSection).getByLabelText("食物"), false);
    expectInside(mealDetails, within(mealSection).getByLabelText("实际摄入量"), false);
    expectInside(mealDetails, within(mealSection).getByLabelText("单位（填写数量时必填）"), false);
    expectInside(drinkDetails, within(drinkSection).getByLabelText("体积（ml，可不填）"), false);
    expectInside(drinkDetails, within(drinkSection).getByLabelText("备注"));
  });

  it.each<[string, () => ReactElement]>([
    ["growth", () => <GrowthForm childId="child-1" measurement={{
      id: "growth-1", childId: "child-1", measuredAt: "2026-10-20T08:00:00.000Z",
      heightCm: 96.2, weightKg: 14.8, headCircumferenceCm: null, bmi: 16,
      heightChangeCm: null, weightChangeKg: null, source: "HOME", place: "家中",
      method: null, device: null, precisionNote: null, notes: null, deletedAt: null,
      createdAt: "2026-10-20T08:00:00.000Z", updatedAt: "2026-10-20T08:00:00.000Z"
    }} />],
    ["sleep", () => <SleepForm childId="child-1" record={{
      id: "sleep-1", kind: "NIGHT", startedAt: "2026-10-20T12:00:00.000Z",
      endedAt: "2026-10-20T22:00:00.000Z", awakeMinutes: 10, wakeCount: null,
      observation: null, source: "HOME", deletedAt: null, sleepMinutes: 590
    }} />],
    ["activity", () => <ActivityForm childId="child-1" record={{
      id: "activity-1", activityType: "骑车", durationMinutes: 40, outdoorMinutes: 30,
      intensity: "MODERATE", structure: "FREE_PLAY", occurredAt: "2026-10-20T08:00:00.000Z",
      engagement: "主动", notes: null, source: "HOME", deletedAt: null
    }} />],
    ["emotion", () => <EmotionForm childId="child-1" record={{
      id: "emotion-1", mood: "HAPPY", tags: ["同伴互动"], context: "幼儿园",
      durationMinutes: null, peerInteraction: null, parentInteraction: null, notes: null,
      occurredAt: "2026-10-20T08:00:00.000Z", source: "HOME", deletedAt: null
    }} />]
  ])("opens optional %s fields when an edited record contains optional content", (_domain, form) => {
    const { container } = render(form());
    expect(optionalDetails(container)).toHaveAttribute("open");
  });

  it("opens optional nutrition edit fields when saved optional content exists", () => {
    const { container } = render(<NutritionClient childId="child-1" meals={[{
      id: "meal-1", type: "LUNCH", occurredAt: "2026-10-20T04:00:00.000Z",
      appetite: "良好", notes: null, source: "HOME", deletedAt: null,
      items: [{ id: "item-1", name: "米饭", category: "主食", offeredAmount: 120,
        consumedAmount: 100, estimatedAmount: null, amountUnit: "g", isNewFood: false,
        reactionNote: null }]
    }]} beverages={[{
      id: "drink-1", type: "WATER", volumeMl: 120, occurredAt: "2026-10-20T05:00:00.000Z",
      notes: "外出", source: "HOME", deletedAt: null
    }]} />);

    const editOptionals = container.querySelectorAll(".record-card details.optional-fields");
    expect(editOptionals).toHaveLength(2);
    expect(editOptionals[0]).toHaveAttribute("open");
    expect(editOptionals[1]).toHaveAttribute("open");
  });
});

const growthRecord = {
  id: "growth-1", childId: "child-1", measuredAt: "2026-10-20T08:00:00.000Z",
  heightCm: 96.2, weightKg: 14.8, headCircumferenceCm: null, bmi: 16,
  heightChangeCm: null, weightChangeKg: null, source: "HOME" as const, place: null,
  method: null, device: null, precisionNote: null, notes: null, deletedAt: null,
  createdAt: "2026-10-20T08:00:00.000Z", updatedAt: "2026-10-20T08:00:00.000Z"
};

describe("record form action safeguards", () => {
  it("does not request deletion when confirmation is cancelled", () => {
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(false));
    vi.stubGlobal("fetch", vi.fn());
    render(<GrowthForm childId="child-1" measurement={growthRecord} />);

    fireEvent.click(screen.getByRole("button", { name: "删除记录" }));

    expect(confirm).toHaveBeenCalledOnce();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("uses the existing DELETE endpoint after confirmation", async () => {
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    render(<GrowthForm childId="child-1" measurement={growthRecord} />);

    fireEvent.click(screen.getByRole("button", { name: "删除记录" }));

    await waitFor(() => expect(fetch).toHaveBeenCalledWith(
      "/api/children/child-1/growth/growth-1",
      expect.objectContaining({ method: "DELETE" })
    ));
  });

  it("disables sleep deletion while its request is pending", async () => {
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => undefined)));
    render(<SleepForm childId="child-1" record={{
      id: "sleep-1", kind: "NIGHT", startedAt: "2026-10-20T12:00:00.000Z",
      endedAt: "2026-10-20T22:00:00.000Z", awakeMinutes: null, wakeCount: null,
      observation: null, source: "HOME", deletedAt: null, sleepMinutes: 600
    }} />);

    const deleteButton = screen.getByRole("button", { name: "删除记录" });
    fireEvent.click(deleteButton);

    await waitFor(() => expect(deleteButton).toBeDisabled());
  });

  it("announces a failed save as an alert", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ error: { message: "请检查输入。" } }, { status: 400 })));
    const { container } = render(<GrowthForm childId="child-1" />);

    fireEvent.submit(container.querySelector("form")!);

    expect(await screen.findByRole("alert")).toHaveTextContent("请检查输入。");
  });

  it("announces a successful save as status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ data: {} }, { status: 201 })));
    const { container } = render(<GrowthForm childId="child-1" />);

    fireEvent.submit(container.querySelector("form")!);

    expect(await screen.findByRole("status")).toHaveTextContent("记录已添加。");
  });
});
