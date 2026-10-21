import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  createBeverageWithAudit, createMealWithAudit, listBeveragesForChild, listMealsForChild,
  restoreBeverageWithAudit, restoreMealWithAudit, softDeleteBeverageWithAudit,
  softDeleteMealWithAudit, updateBeverageWithAudit, updateMealWithAudit
} from "@/modules/nutrition/nutrition-repository";

const databaseUrl = process.env.DATABASE_URL;
const suite = databaseUrl?.includes("growlog_test") ? describe : describe.skip;
let prisma: PrismaClient;
suite("nutrition persistence", () => {
  beforeAll(() => { prisma = new PrismaClient({ datasourceUrl: databaseUrl }); });
  beforeEach(async () => {
    await prisma.auditLog.deleteMany(); await prisma.mealItem.deleteMany(); await prisma.meal.deleteMany();
    await prisma.beverageIntake.deleteMany(); await prisma.sleepSession.deleteMany();
    await prisma.growthMeasurement.deleteMany(); await prisma.child.deleteMany(); await prisma.household.deleteMany();
  });
  afterAll(async () => {
    await prisma.auditLog.deleteMany(); await prisma.mealItem.deleteMany(); await prisma.meal.deleteMany();
    await prisma.beverageIntake.deleteMany(); await prisma.child.deleteMany(); await prisma.household.deleteMany();
    await prisma.$disconnect();
  });
  it("persists meals/items and beverages through edit, delete, and restore", async () => {
    const household = await prisma.household.create({ data: { name: "Owner" } });
    const child = await prisma.child.create({ data: { householdId: household.id, name: "小满", birthDate: new Date("2022-05-12") } });
    const meal = await createMealWithAudit(prisma, household.id, child.id, {
      type: "BREAKFAST", occurredAt: new Date("2026-10-20T00:30:00Z"), source: "HOME",
      items: [{ name: "燕麦粥", offeredAmount: 200, consumedAmount: 150, amountUnit: "g", isNewFood: false }]
    }, "parent");
    expect(meal?.items[0]?.consumedAmount?.toNumber()).toBe(150);
    await expect(updateMealWithAudit(prisma, household.id, child.id, meal!.id, {
      type: "BREAKFAST", occurredAt: new Date("2026-10-20T00:30:00Z"), source: "HOME",
      items: [{ name: "燕麦粥", consumedAmount: 160, amountUnit: "g", isNewFood: false }]
    }, "parent")).resolves.toMatchObject({ items: [{ name: "燕麦粥" }] });
    await softDeleteMealWithAudit(prisma, household.id, child.id, meal!.id, "parent");
    expect(await listMealsForChild(prisma, household.id, child.id)).toHaveLength(0);
    await restoreMealWithAudit(prisma, household.id, child.id, meal!.id, "parent");

    const drink = await createBeverageWithAudit(prisma, household.id, child.id, {
      type: "MILK", volumeMl: null, occurredAt: new Date("2026-10-20T02:00:00Z"), source: "HOME"
    }, "parent");
    await updateBeverageWithAudit(prisma, household.id, child.id, drink!.id, { volumeMl: 180 }, "parent");
    await softDeleteBeverageWithAudit(prisma, household.id, child.id, drink!.id, "parent");
    expect(await listBeveragesForChild(prisma, household.id, child.id)).toHaveLength(0);
    await restoreBeverageWithAudit(prisma, household.id, child.id, drink!.id, "parent");
    expect((await listBeveragesForChild(prisma, household.id, child.id))[0]?.volumeMl).toBe(180);
    expect((await listMealsForChild(prisma, household.id, child.id))[0]?.items).toHaveLength(1);
    expect((await prisma.auditLog.findMany()).map((entry) => entry.action)).toEqual([
      "CREATE", "UPDATE", "DELETE", "RESTORE", "CREATE", "UPDATE", "DELETE", "RESTORE"
    ]);
  });
});
