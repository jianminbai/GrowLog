import type { EmotionRecord, Prisma, PrismaClient } from "@prisma/client";

import type { EmotionCreateValues, EmotionUpdateValues } from "./emotion-record";

export type EmotionClient = Pick<PrismaClient, "$transaction" | "emotionRecord" | "household">;

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
    entityType: "EmotionRecord",
    entityId,
    metadata: { changedFields: fields }
  } });
}

export function createEmotionWithAudit(
  client: EmotionClient,
  householdId: string,
  childId: string,
  values: EmotionCreateValues,
  actorId: string
) {
  return client.$transaction(async (transaction): Promise<EmotionRecord | null> => {
    const child = await transaction.child.findFirst({
      where: { id: childId, householdId, deletedAt: null }, select: { id: true }
    });
    if (!child) return null;
    const record = await transaction.emotionRecord.create({ data: { householdId, childId, ...values } });
    await audit(transaction, householdId, actorId, "CREATE", record.id, changedFields(values));
    return record;
  });
}

export function listEmotionsForChild(
  client: EmotionClient,
  householdId: string,
  childId: string,
  includeDeleted = false
) {
  return client.emotionRecord.findMany({
    where: { householdId, childId, ...(includeDeleted ? {} : { deletedAt: null }) },
    orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }]
  });
}

export function findEmotionForChild(
  client: EmotionClient,
  householdId: string,
  childId: string,
  emotionId: string,
  includeDeleted = false
) {
  return client.emotionRecord.findFirst({
    where: { id: emotionId, householdId, childId, ...(includeDeleted ? {} : { deletedAt: null }) }
  });
}

export async function getEmotionHouseholdTimeZone(client: EmotionClient, householdId: string) {
  return (await client.household.findUnique({
    where: { id: householdId }, select: { timeZone: true }
  }))?.timeZone ?? "UTC";
}

export function updateEmotionWithAudit(
  client: EmotionClient,
  householdId: string,
  childId: string,
  emotionId: string,
  values: EmotionUpdateValues,
  actorId: string
) {
  return client.$transaction(async (transaction): Promise<EmotionRecord | null> => {
    const existing = await transaction.emotionRecord.findFirst({
      where: { id: emotionId, householdId, childId, deletedAt: null }, select: { id: true }
    });
    if (!existing) return null;
    const record = await transaction.emotionRecord.update({ where: { id: emotionId }, data: values });
    await audit(transaction, householdId, actorId, "UPDATE", record.id, changedFields(values));
    return record;
  });
}

export function softDeleteEmotionWithAudit(
  client: EmotionClient,
  householdId: string,
  childId: string,
  emotionId: string,
  actorId: string
) {
  return client.$transaction(async (transaction): Promise<EmotionRecord | null> => {
    const existing = await transaction.emotionRecord.findFirst({
      where: { id: emotionId, householdId, childId, deletedAt: null }, select: { id: true }
    });
    if (!existing) return null;
    const record = await transaction.emotionRecord.update({
      where: { id: emotionId }, data: { deletedAt: new Date() }
    });
    await audit(transaction, householdId, actorId, "DELETE", record.id, ["deletedAt"]);
    return record;
  });
}

export function restoreEmotionWithAudit(
  client: EmotionClient,
  householdId: string,
  childId: string,
  emotionId: string,
  actorId: string
) {
  return client.$transaction(async (transaction): Promise<EmotionRecord | null> => {
    const existing = await transaction.emotionRecord.findFirst({
      where: { id: emotionId, householdId, childId, deletedAt: { not: null } }, select: { id: true }
    });
    if (!existing) return null;
    const record = await transaction.emotionRecord.update({
      where: { id: emotionId }, data: { deletedAt: null }
    });
    await audit(transaction, householdId, actorId, "RESTORE", record.id, ["deletedAt"]);
    return record;
  });
}
