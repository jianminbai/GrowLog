import type { PhysicalActivity, Prisma, PrismaClient } from "@prisma/client";

import type { ActivityCreateValues, ActivityUpdateValues } from "./activity-record";

export type ActivityClient = Pick<PrismaClient, "$transaction" | "physicalActivity" | "household">;

function changedFields(values: Record<string, unknown>) {
  return Object.keys(values).filter((key) => values[key] !== undefined).sort();
}

async function audit(
  transaction: Prisma.TransactionClient,
  householdId: string,
  actorId: string,
  action: "CREATE" | "UPDATE" | "DELETE" | "RESTORE",
  entityId: string,
  fields: string[]
) {
  await transaction.auditLog.create({ data: {
    householdId,
    actorId,
    action,
    entityType: "PhysicalActivity",
    entityId,
    metadata: { changedFields: fields }
  } });
}

export function createActivityWithAudit(
  client: ActivityClient,
  householdId: string,
  childId: string,
  values: ActivityCreateValues,
  actorId: string
) {
  return client.$transaction(async (transaction): Promise<PhysicalActivity | null> => {
    const child = await transaction.child.findFirst({
      where: { id: childId, householdId, deletedAt: null }, select: { id: true }
    });
    if (!child) return null;
    const record = await transaction.physicalActivity.create({ data: { householdId, childId, ...values } });
    await audit(transaction, householdId, actorId, "CREATE", record.id, changedFields(values));
    return record;
  });
}

export function listActivitiesForChild(
  client: ActivityClient,
  householdId: string,
  childId: string,
  includeDeleted = false
) {
  return client.physicalActivity.findMany({
    where: { householdId, childId, ...(includeDeleted ? {} : { deletedAt: null }) },
    orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }]
  });
}

export function findActivityForChild(
  client: ActivityClient,
  householdId: string,
  childId: string,
  activityId: string,
  includeDeleted = false
) {
  return client.physicalActivity.findFirst({
    where: { id: activityId, householdId, childId, ...(includeDeleted ? {} : { deletedAt: null }) }
  });
}

export async function getActivityHouseholdTimeZone(client: ActivityClient, householdId: string) {
  return (await client.household.findUnique({
    where: { id: householdId }, select: { timeZone: true }
  }))?.timeZone ?? "UTC";
}

export function updateActivityWithAudit(
  client: ActivityClient,
  householdId: string,
  childId: string,
  activityId: string,
  values: ActivityUpdateValues,
  actorId: string
) {
  return client.$transaction(async (transaction): Promise<PhysicalActivity | null> => {
    const existing = await transaction.physicalActivity.findFirst({
      where: { id: activityId, householdId, childId, deletedAt: null }, select: { id: true }
    });
    if (!existing) return null;
    const record = await transaction.physicalActivity.update({ where: { id: activityId }, data: values });
    await audit(transaction, householdId, actorId, "UPDATE", record.id, changedFields(values));
    return record;
  });
}

export function softDeleteActivityWithAudit(
  client: ActivityClient,
  householdId: string,
  childId: string,
  activityId: string,
  actorId: string
) {
  return client.$transaction(async (transaction): Promise<PhysicalActivity | null> => {
    const existing = await transaction.physicalActivity.findFirst({
      where: { id: activityId, householdId, childId, deletedAt: null }, select: { id: true }
    });
    if (!existing) return null;
    const record = await transaction.physicalActivity.update({
      where: { id: activityId }, data: { deletedAt: new Date() }
    });
    await audit(transaction, householdId, actorId, "DELETE", record.id, ["deletedAt"]);
    return record;
  });
}

export function restoreActivityWithAudit(
  client: ActivityClient,
  householdId: string,
  childId: string,
  activityId: string,
  actorId: string
) {
  return client.$transaction(async (transaction): Promise<PhysicalActivity | null> => {
    const existing = await transaction.physicalActivity.findFirst({
      where: { id: activityId, householdId, childId, deletedAt: { not: null } }, select: { id: true }
    });
    if (!existing) return null;
    const record = await transaction.physicalActivity.update({
      where: { id: activityId }, data: { deletedAt: null }
    });
    await audit(transaction, householdId, actorId, "RESTORE", record.id, ["deletedAt"]);
    return record;
  });
}
