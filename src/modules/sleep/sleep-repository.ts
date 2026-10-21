import type { DataSource, Prisma, PrismaClient, SleepKind, SleepSession } from "@prisma/client";

export type SleepValues = {
  kind: SleepKind;
  startedAt: Date;
  endedAt: Date;
  awakeMinutes?: number | null;
  wakeCount?: number | null;
  observation?: string | null;
  source: DataSource;
};
export type CreateSleepInput = SleepValues & { householdId: string; childId: string };
export type UpdateSleepInput = Partial<SleepValues>;
export type SleepPrismaClient = Pick<PrismaClient, "$transaction" | "sleepSession" | "household">;

function fields(input: Record<string, unknown>) {
  return Object.keys(input)
    .filter((key) => !["householdId", "childId"].includes(key) && input[key] !== undefined)
    .sort();
}

async function audit(
  transaction: Prisma.TransactionClient,
  householdId: string,
  actorId: string,
  action: "CREATE" | "UPDATE" | "DELETE" | "RESTORE",
  entityId: string,
  changedFields: string[]
) {
  await transaction.auditLog.create({ data: {
    householdId, actorId, action, entityType: "SleepSession", entityId,
    metadata: { changedFields }
  } });
}

export function createSleepWithAudit(client: SleepPrismaClient, input: CreateSleepInput, actorId: string) {
  return client.$transaction(async (transaction): Promise<SleepSession | null> => {
    const child = await transaction.child.findFirst({
      where: { id: input.childId, householdId: input.householdId, deletedAt: null }, select: { id: true }
    });
    if (!child) return null;
    const record = await transaction.sleepSession.create({ data: input });
    await audit(transaction, input.householdId, actorId, "CREATE", record.id, fields(input));
    return record;
  });
}

export function listSleepForChild(
  client: SleepPrismaClient, householdId: string, childId: string, includeDeleted = false
) {
  return client.sleepSession.findMany({
    where: { householdId, childId, ...(includeDeleted ? {} : { deletedAt: null }) },
    orderBy: [{ endedAt: "asc" }, { createdAt: "asc" }]
  });
}

export function findSleepForChild(
  client: SleepPrismaClient, householdId: string, childId: string, sessionId: string, includeDeleted = false
) {
  return client.sleepSession.findFirst({
    where: { id: sessionId, householdId, childId, ...(includeDeleted ? {} : { deletedAt: null }) }
  });
}

export async function getHouseholdTimeZone(client: SleepPrismaClient, householdId: string) {
  return (await client.household.findUnique({ where: { id: householdId }, select: { timeZone: true } }))
    ?.timeZone ?? "UTC";
}

export function updateSleepWithAudit(
  client: SleepPrismaClient, householdId: string, childId: string, sessionId: string,
  input: UpdateSleepInput, actorId: string
) {
  return client.$transaction(async (transaction): Promise<SleepSession | null> => {
    const existing = await transaction.sleepSession.findFirst({
      where: { id: sessionId, householdId, childId, deletedAt: null }, select: { id: true }
    });
    if (!existing) return null;
    const record = await transaction.sleepSession.update({ where: { id: existing.id }, data: input });
    await audit(transaction, householdId, actorId, "UPDATE", record.id, fields(input));
    return record;
  });
}

export function softDeleteSleepWithAudit(
  client: SleepPrismaClient, householdId: string, childId: string, sessionId: string,
  actorId: string, deletedAt = new Date()
) {
  return client.$transaction(async (transaction): Promise<SleepSession | null> => {
    const existing = await transaction.sleepSession.findFirst({
      where: { id: sessionId, householdId, childId, deletedAt: null }, select: { id: true }
    });
    if (!existing) return null;
    const record = await transaction.sleepSession.update({ where: { id: existing.id }, data: { deletedAt } });
    await audit(transaction, householdId, actorId, "DELETE", record.id, ["deletedAt"]);
    return record;
  });
}

export function restoreSleepWithAudit(
  client: SleepPrismaClient, householdId: string, childId: string, sessionId: string, actorId: string
) {
  return client.$transaction(async (transaction): Promise<SleepSession | null> => {
    const existing = await transaction.sleepSession.findFirst({
      where: { id: sessionId, householdId, childId, deletedAt: { not: null } }, select: { id: true }
    });
    if (!existing) return null;
    const record = await transaction.sleepSession.update({ where: { id: existing.id }, data: { deletedAt: null } });
    await audit(transaction, householdId, actorId, "RESTORE", record.id, ["deletedAt"]);
    return record;
  });
}
