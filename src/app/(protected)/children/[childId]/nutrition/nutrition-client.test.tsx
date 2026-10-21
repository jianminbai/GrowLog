// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { NutritionClient } from "./nutrition-client";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

describe("nutrition history editing", () => {
  it("offers edit forms for active meals and beverages", () => {
    render(<NutritionClient childId="child-1" meals={[{
      id: "meal-1", type: "LUNCH", occurredAt: "2026-10-20T04:00:00.000Z", deletedAt: null,
      appetite: null, notes: null, source: "HOME",
      items: [{ id: "item-1", name: "米饭", category: null, offeredAmount: null, consumedAmount: 100,
        estimatedAmount: null, amountUnit: "g", isNewFood: false, reactionNote: null }]
    }]} beverages={[{
      id: "drink-1", type: "WATER", volumeMl: 120, occurredAt: "2026-10-20T05:00:00.000Z",
      notes: null, source: "HOME", deletedAt: null
    }]} />);

    expect(screen.getByText("编辑餐食")).toBeTruthy();
    expect(screen.getByText("编辑饮品")).toBeTruthy();
  });
});
