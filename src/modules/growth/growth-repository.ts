import type { DataSource, GrowthMeasurement, PrismaClient } from "@prisma/client";

export type GrowthValues = {
  measuredAt: Date;
  heightCm?: number | null;
  weightKg?: number | null;
  headCircumferenceCm?: number | null;
  source: DataSource;
  place?: string | null;
  method?: string | null;
  device?: string | null;
  precisionNote?: string | null;
  notes?: string | null;
};

export type CreateGrowthInput = GrowthValues & { householdId: string; childId: string };
export type UpdateGrowthInput = Partial<GrowthValues>;
export type GrowthPrismaClient = Pick<PrismaClient, "$transaction" | "growthMeasurement">;

function changedFields(input: Record<string, unknown>): string[] {
  return Object.keys(input)
    .filter(
      (field) => field !== "householdId" && field !== "childId" && input[field] !== undefined
    )
    .sort();
}

export function createGrowthWithAudit(
  client: GrowthPrismaClient,
  input: CreateGrowthInput,
  actorId: string
): Promise<GrowthMeasurement | null> {
  return client.$transaction(async (transaction) => {
    const child = await transaction.child.findFirst({
      where: { id: input.childId, householdId: input.householdId, deletedAt: null },
      select: { id: true }
    });
    if (!child) return null;

    const record = await transaction.growthMeasurement.create({ data: input });
    await transaction.auditLog.create({
      data: {
        householdId: input.householdId,
        actorId,
        action: "CREATE",
        entityType: "GrowthMeasurement",
        entityId: record.id,
        metadata: { changedFields: changedFields(input) }
      }
    });
    return record;
  });
}

export function listGrowthForChild(
  client: GrowthPrismaClient,
  householdId: string,
  childId: string,
  includeDeleted = false
): Promise<GrowthMeasurement[]> {
  return client.growthMeasurement.findMany({
    where: {
      householdId,
      childId,
      ...(includeDeleted ? {} : { deletedAt: null })
    },
    orderBy: [{ measuredAt: "asc" }, { createdAt: "asc" }]
  });
}

export function findGrowthForChild(
  client: GrowthPrismaClient,
  householdId: string,
  childId: string,
  measurementId: string,
  includeDeleted = false
): Promise<GrowthMeasurement | null> {
  return client.growthMeasurement.findFirst({
    where: {
      id: measurementId,
      householdId,
      childId,
      ...(includeDeleted ? {} : { deletedAt: null })
    }
  });
}

export function updateGrowthWithAudit(
  client: GrowthPrismaClient,
  householdId: string,
  childId: string,
  measurementId: string,
  input: UpdateGrowthInput,
  actorId: string
): Promise<GrowthMeasurement | null> {
  return client.$transaction(async (transaction) => {
    const existing = await transaction.growthMeasurement.findFirst({
      where: { id: measurementId, householdId, childId, deletedAt: null },
      select: { id: true }
    });
    if (!existing) return null;
    const record = await transaction.growthMeasurement.update({
      where: { id: existing.id },
      data: input
    });
    await transaction.auditLog.create({
      data: {
        householdId,
        actorId,
        action: "UPDATE",
        entityType: "GrowthMeasurement",
        entityId: record.id,
        metadata: { changedFields: changedFields(input) }
      }
    });
    return record;
  });
}

export function softDeleteGrowthWithAudit(
  client: GrowthPrismaClient,
  householdId: string,
  childId: string,
  measurementId: string,
  actorId: string,
  deletedAt = new Date()
): Promise<GrowthMeasurement | null> {
  return client.$transaction(async (transaction) => {
    const existing = await transaction.growthMeasurement.findFirst({
      where: { id: measurementId, householdId, childId, deletedAt: null },
      select: { id: true }
    });
    if (!existing) return null;
    const record = await transaction.growthMeasurement.update({
      where: { id: existing.id },
      data: { deletedAt }
    });
    await transaction.auditLog.create({
      data: {
        householdId,
        actorId,
        action: "DELETE",
        entityType: "GrowthMeasurement",
        entityId: record.id,
        metadata: { changedFields: ["deletedAt"] }
      }
    });
    return record;
  });
}

export function restoreGrowthWithAudit(
  client: GrowthPrismaClient,
  householdId: string,
  childId: string,
  measurementId: string,
  actorId: string
): Promise<GrowthMeasurement | null> {
  return client.$transaction(async (transaction) => {
    const existing = await transaction.growthMeasurement.findFirst({
      where: { id: measurementId, householdId, childId, deletedAt: { not: null } },
      select: { id: true }
    });
    if (!existing) return null;
    const record = await transaction.growthMeasurement.update({
      where: { id: existing.id },
      data: { deletedAt: null }
    });
    await transaction.auditLog.create({
      data: {
        householdId,
        actorId,
        action: "RESTORE",
        entityType: "GrowthMeasurement",
        entityId: record.id,
        metadata: { changedFields: ["deletedAt"] }
      }
    });
    return record;
  });
}
