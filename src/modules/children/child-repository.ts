import type { Child, PrismaClient, Sex } from "@prisma/client";

export type ChildProfileValues = {
  name: string;
  birthDate: Date;
  sex: Sex;
  birthHeightCm?: number | null;
  birthWeightKg?: number | null;
  motherHeightCm?: number | null;
  fatherHeightCm?: number | null;
  notes?: string | null;
};

export type CreateChildInput = ChildProfileValues & {
  householdId: string;
};

export type UpdateChildInput = Partial<ChildProfileValues>;

export type StoredChild = Child;

export type ChildPrismaClient = Pick<PrismaClient, "$transaction" | "child">;

function changedFields(input: Record<string, unknown>): string[] {
  return Object.keys(input)
    .filter((field) => field !== "householdId" && input[field] !== undefined)
    .sort();
}

export function createChildWithAudit(
  client: ChildPrismaClient,
  input: CreateChildInput,
  actorId: string
): Promise<StoredChild> {
  return client.$transaction(async (transaction) => {
    const child = await transaction.child.create({ data: input });
    await transaction.auditLog.create({
      data: {
        householdId: input.householdId,
        actorId,
        action: "CREATE",
        entityType: "Child",
        entityId: child.id,
        metadata: { changedFields: changedFields(input) }
      }
    });
    return child;
  });
}

export function listChildrenForHousehold(
  client: ChildPrismaClient,
  householdId: string
): Promise<StoredChild[]> {
  return client.child.findMany({
    where: { householdId, deletedAt: null },
    orderBy: [{ name: "asc" }, { createdAt: "asc" }]
  });
}

export function findChildForHousehold(
  client: ChildPrismaClient,
  householdId: string,
  childId: string
): Promise<StoredChild | null> {
  return client.child.findFirst({
    where: { id: childId, householdId, deletedAt: null }
  });
}

export function updateChildWithAudit(
  client: ChildPrismaClient,
  householdId: string,
  childId: string,
  input: UpdateChildInput,
  actorId: string
): Promise<StoredChild | null> {
  return client.$transaction(async (transaction) => {
    const existing = await transaction.child.findFirst({
      where: { id: childId, householdId, deletedAt: null },
      select: { id: true }
    });
    if (!existing) return null;

    const child = await transaction.child.update({
      where: { id: existing.id },
      data: input
    });
    await transaction.auditLog.create({
      data: {
        householdId,
        actorId,
        action: "UPDATE",
        entityType: "Child",
        entityId: child.id,
        metadata: { changedFields: changedFields(input) }
      }
    });
    return child;
  });
}
