import { beforeEach, describe, expect, it, vi } from "vitest";
import { issueSession, type SessionRecord, type SessionRepository } from "@/modules/auth/auth-service";
import { SESSION_COOKIE_NAME } from "@/modules/auth/auth-constants";
import { createNutritionHandlers, type NutritionHandlerDependencies } from "./nutrition-handlers";

function sessionRepo(): SessionRepository { const values: SessionRecord[] = []; return {
  async create(value) { values.push(value); }, async findByTokenDigest(digest) { return values.find((v) => v.tokenDigest === digest) ?? null; }, async revokeByTokenDigest() {}
}; }
describe("nutrition handlers", () => {
  let dependencies: NutritionHandlerDependencies; let cookie: string;
  beforeEach(async () => { const sessions = sessionRepo(); const issued = await issueSession("household-1", sessions); cookie = `${SESSION_COOKIE_NAME}=${issued.token}`;
    dependencies = { sessions, actorId: "parent", nutrition: {
      listMeals: vi.fn().mockResolvedValue([{ id: "meal-1", householdId: "household-1", childId: "child-1", type: "BREAKFAST", occurredAt: new Date("2026-10-20T00:30:00Z"), appetite: null, notes: null, source: "HOME", createdAt: new Date(), updatedAt: new Date(), deletedAt: null, items: [{ id: "item-1", householdId: "household-1", mealId: "meal-1", name: "粥", category: null, offeredAmount: null, consumedAmount: null, estimatedAmount: null, amountUnit: null, isNewFood: false, reactionNote: null, source: "MANUAL", createdAt: new Date(), updatedAt: new Date(), deletedAt: null }] }]),
      listBeverages: vi.fn().mockResolvedValue([{ id: "drink-1", householdId: "household-1", childId: "child-1", type: "MILK", volumeMl: 180, occurredAt: new Date("2026-10-20T02:00:00Z"), notes: null, source: "HOME", createdAt: new Date(), updatedAt: new Date(), deletedAt: null }]),
      createMeal: vi.fn(), updateMeal: vi.fn(), removeMeal: vi.fn(), restoreMeal: vi.fn(), createBeverage: vi.fn(), updateBeverage: vi.fn(), removeBeverage: vi.fn(), restoreBeverage: vi.fn(), timeZone: vi.fn().mockResolvedValue("Asia/Shanghai")
    } };
  });
  it("returns meal and drink history with daily totals", async () => {
    const response = await createNutritionHandlers(dependencies).list(new Request("https://growlog.test/api/children/child-1/nutrition?date=2026-10-20", { headers: { cookie } }), "child-1");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ data: { summary: { mealCount: 1, foodItemCount: 1, milkMl: 180, unknownBeverageCount: 0 } } });
  });
});
