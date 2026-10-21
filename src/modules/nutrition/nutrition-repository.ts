import type { BeverageIntake, Prisma, PrismaClient } from "@prisma/client";
import type { BeverageValues, MealValues } from "./nutrition-record";

export type StoredMeal = Prisma.MealGetPayload<{ include: { items: true } }>;
export type NutritionClient = Pick<PrismaClient, "$transaction" | "meal" | "beverageIntake">;

async function audit(tx: Prisma.TransactionClient, householdId: string, actorId: string, action: "CREATE"|"UPDATE"|"DELETE"|"RESTORE", type: string, id: string, fields: string[]) {
  await tx.auditLog.create({ data: { householdId, actorId, action, entityType: type, entityId: id, metadata: { changedFields: fields } } });
}
const mealFields = ["appetite", "items", "notes", "occurredAt", "source", "type"];

export function createMealWithAudit(client: NutritionClient, householdId: string, childId: string, values: MealValues, actorId: string) {
  return client.$transaction(async (tx): Promise<StoredMeal | null> => {
    if (!await tx.child.findFirst({ where: { id: childId, householdId, deletedAt: null } })) return null;
    const { items, ...meal } = values;
    const record = await tx.meal.create({ data: {
      ...meal, householdId, childId,
      items: { create: items.map((item) => ({ ...item, householdId })) }
    }, include: { items: true } });
    await audit(tx, householdId, actorId, "CREATE", "Meal", record.id, mealFields);
    return record;
  });
}
export function listMealsForChild(client: NutritionClient, householdId: string, childId: string, includeDeleted = false) {
  return client.meal.findMany({ where: { householdId, childId, ...(includeDeleted ? {} : { deletedAt: null }) }, include: { items: { where: includeDeleted ? {} : { deletedAt: null } } }, orderBy: { occurredAt: "asc" } });
}
export function updateMealWithAudit(client: NutritionClient, householdId: string, childId: string, mealId: string, values: MealValues, actorId: string) {
  return client.$transaction(async (tx): Promise<StoredMeal | null> => {
    if (!await tx.meal.findFirst({ where: { id: mealId, householdId, childId, deletedAt: null } })) return null;
    const now = new Date(); await tx.mealItem.updateMany({ where: { mealId, householdId, deletedAt: null }, data: { deletedAt: now } });
    const { items, ...meal } = values;
    const record = await tx.meal.update({ where: { id: mealId }, data: { ...meal, items: { create: items.map((item) => ({ ...item, householdId })) } }, include: { items: { where: { deletedAt: null } } } });
    await audit(tx, householdId, actorId, "UPDATE", "Meal", record.id, mealFields); return record;
  });
}
export function softDeleteMealWithAudit(client: NutritionClient, householdId: string, childId: string, mealId: string, actorId: string) {
  return client.$transaction(async (tx): Promise<StoredMeal | null> => {
    if (!await tx.meal.findFirst({ where: { id: mealId, householdId, childId, deletedAt: null } })) return null;
    const deletedAt = new Date(); await tx.mealItem.updateMany({ where: { mealId, deletedAt: null }, data: { deletedAt } });
    const record = await tx.meal.update({ where: { id: mealId }, data: { deletedAt }, include: { items: true } });
    await audit(tx, householdId, actorId, "DELETE", "Meal", record.id, ["deletedAt"]); return record;
  });
}
export function restoreMealWithAudit(client: NutritionClient, householdId: string, childId: string, mealId: string, actorId: string) {
  return client.$transaction(async (tx): Promise<StoredMeal | null> => {
    const existing = await tx.meal.findFirst({ where: { id: mealId, householdId, childId, deletedAt: { not: null } }, select: { deletedAt: true } });
    if (!existing?.deletedAt) return null;
    await tx.mealItem.updateMany({ where: { mealId, deletedAt: existing.deletedAt }, data: { deletedAt: null } });
    const record = await tx.meal.update({ where: { id: mealId }, data: { deletedAt: null }, include: { items: true } });
    await audit(tx, householdId, actorId, "RESTORE", "Meal", record.id, ["deletedAt"]); return record;
  });
}

export function createBeverageWithAudit(client: NutritionClient, householdId: string, childId: string, values: BeverageValues, actorId: string) {
  return client.$transaction(async (tx): Promise<BeverageIntake | null> => {
    if (!await tx.child.findFirst({ where: { id: childId, householdId, deletedAt: null } })) return null;
    const record = await tx.beverageIntake.create({ data: { householdId, childId, ...values } });
    await audit(tx, householdId, actorId, "CREATE", "BeverageIntake", record.id, Object.keys(values).sort()); return record;
  });
}
export function listBeveragesForChild(client: NutritionClient, householdId: string, childId: string, includeDeleted = false) {
  return client.beverageIntake.findMany({ where: { householdId, childId, ...(includeDeleted ? {} : { deletedAt: null }) }, orderBy: { occurredAt: "asc" } });
}
export function updateBeverageWithAudit(client: NutritionClient, householdId: string, childId: string, id: string, values: Partial<BeverageValues>, actorId: string) {
  return client.$transaction(async (tx): Promise<BeverageIntake | null> => {
    if (!await tx.beverageIntake.findFirst({ where: { id, householdId, childId, deletedAt: null } })) return null;
    const record = await tx.beverageIntake.update({ where: { id }, data: values });
    await audit(tx, householdId, actorId, "UPDATE", "BeverageIntake", id, Object.keys(values).sort()); return record;
  });
}
export function softDeleteBeverageWithAudit(client: NutritionClient, householdId: string, childId: string, id: string, actorId: string) {
  return client.$transaction(async (tx): Promise<BeverageIntake | null> => {
    if (!await tx.beverageIntake.findFirst({ where: { id, householdId, childId, deletedAt: null } })) return null;
    const record = await tx.beverageIntake.update({ where: { id }, data: { deletedAt: new Date() } });
    await audit(tx, householdId, actorId, "DELETE", "BeverageIntake", id, ["deletedAt"]); return record;
  });
}
export function restoreBeverageWithAudit(client: NutritionClient, householdId: string, childId: string, id: string, actorId: string) {
  return client.$transaction(async (tx): Promise<BeverageIntake | null> => {
    if (!await tx.beverageIntake.findFirst({ where: { id, householdId, childId, deletedAt: { not: null } } })) return null;
    const record = await tx.beverageIntake.update({ where: { id }, data: { deletedAt: null } });
    await audit(tx, householdId, actorId, "RESTORE", "BeverageIntake", id, ["deletedAt"]); return record;
  });
}
