import { describe, expect, it } from "vitest";
import { beverageSchema, mealSchema, summarizeNutrition } from "./nutrition-record";

describe("nutrition validation", () => {
  it("keeps offered, consumed, and estimated amounts distinct", () => {
    const meal = mealSchema.parse({
      type: "BREAKFAST", occurredAt: "2026-10-20T00:30:00.000Z", source: "HOME",
      items: [{ name: "燕麦粥", offeredAmount: 200, consumedAmount: 150, estimatedAmount: null, amountUnit: "g", isNewFood: false }]
    });
    expect(meal.items[0]).toMatchObject({ offeredAmount: 200, consumedAmount: 150, estimatedAmount: null });
  });

  it("requires a unit when any food amount is known", () => {
    expect(mealSchema.safeParse({ type: "LUNCH", occurredAt: "2026-10-20T04:00:00.000Z", source: "HOME", items: [{ name: "米饭", consumedAmount: 80 }] }).success).toBe(false);
  });

  it("allows an unknown beverage volume", () => {
    expect(beverageSchema.parse({ type: "WATER", volumeMl: null, occurredAt: "2026-10-20T03:00:00.000Z", source: "HOME" }).volumeMl).toBeNull();
  });
});

describe("nutrition totals", () => {
  it("totals known volumes without treating unknown values as zero", () => {
    expect(summarizeNutrition(
      [{ occurredAt: new Date("2026-10-20T01:00:00Z"), itemCount: 2 }],
      [
        { occurredAt: new Date("2026-10-20T02:00:00Z"), type: "MILK", volumeMl: 180 },
        { occurredAt: new Date("2026-10-20T03:00:00Z"), type: "WATER", volumeMl: null }
      ], "Asia/Shanghai", "2026-10-20"
    )).toEqual({ mealCount: 1, foodItemCount: 2, milkMl: 180, waterMl: 0, unknownBeverageCount: 1 });
  });
});
