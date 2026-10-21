export type ChildSex = "FEMALE" | "MALE" | "UNSPECIFIED";

export type CreateChildInput = {
  householdId: string;
  name: string;
  birthDate: Date;
  sex: ChildSex;
};

export type StoredChild = CreateChildInput & {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

type ChildTransaction = {
  child: {
    create(args: { data: CreateChildInput }): Promise<StoredChild>;
  };
  auditLog: {
    create(args: {
      data: {
        householdId: string;
        actorId: string;
        action: "CREATE";
        entityType: "Child";
        entityId: string;
        metadata: { changedFields: string[] };
      };
    }): Promise<unknown>;
  };
};

export type ChildPrismaClient = {
  $transaction<T>(operation: (transaction: ChildTransaction) => Promise<T>): Promise<T>;
  child: {
    findFirst(args: {
      where: { id: string; householdId: string; deletedAt: null };
    }): Promise<StoredChild | null>;
  };
};

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
        metadata: { changedFields: ["birthDate", "name", "sex"] }
      }
    });
    return child;
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
