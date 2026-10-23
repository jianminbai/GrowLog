// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { fireEvent, render, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { NutritionClient } from "./nutrition-client";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

describe("nutrition history editing", () => {
  it("uses the same expandable information-card pattern for meals and beverages", () => {
    const { container } = render(<NutritionClient childId="child-1" meals={[{
      id: "meal-1", type: "LUNCH", occurredAt: "2026-10-20T04:00:00.000Z", deletedAt: null,
      appetite: null, notes: null, source: "HOME",
      items: [{ id: "item-1", name: "米饭", category: null, offeredAmount: null, consumedAmount: 100,
        estimatedAmount: null, amountUnit: "g", isNewFood: false, reactionNote: null }]
    }]} beverages={[{
      id: "drink-1", type: "WATER", volumeMl: 120, occurredAt: "2026-10-20T05:00:00.000Z",
      notes: null, source: "HOME", deletedAt: null
    }]} />);

    const cards = [...container.querySelectorAll<HTMLDetailsElement>("details.record-card")];
    expect(cards).toHaveLength(2);
    const mealSummary = cards[0]!.querySelector("summary")!;
    const beverageSummary = cards[1]!.querySelector("summary")!;
    expect(mealSummary).toHaveTextContent("午餐");
    expect(mealSummary).toHaveTextContent("米饭 100g");
    expect(beverageSummary).toHaveTextContent("水 · 120 ml");
    expect(mealSummary).not.toHaveTextContent("LUNCH");
    expect(beverageSummary).not.toHaveTextContent("WATER");

    fireEvent.click(mealSummary);
    expect(cards[0]).toHaveAttribute("open");
    expect(within(cards[0]!).getByRole("button", { name: "保存餐食修改" })).toBeInTheDocument();
    expect(within(cards[0]!).getByRole("button", { name: "删除记录" })).toBeInTheDocument();
  });
});
