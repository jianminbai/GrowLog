import type { KindergartenDocument, KindergartenDocumentType, PrismaClient } from "@prisma/client";

export type DocumentRepositoryClient = PrismaClient;

export type StoredDocumentValues = {
  childId: string;
  type: KindergartenDocumentType;
  periodStart: string;
  originalFileName: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
};

export type UpsertDocumentResult = {
  document: KindergartenDocument;
  created: boolean;
  replacedStorageKey: string | null;
};

const transactionOptions = { isolationLevel: "Serializable" as const };
const auditMetadata = (type: KindergartenDocumentType, periodStart: string, changedFields: string[]) => ({
  changedFields,
  periodStart,
  type
});

function isRetryable(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error &&
    (error.code === "P2034" || error.code === "P2002");
}

async function withSerializableRetry<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isRetryable(error)) throw error;
      lastError = error;
    }
  }
  throw lastError;
}

function periodDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function listDocumentsForChild(client: DocumentRepositoryClient, householdId: string, childId: string) {
  return client.kindergartenDocument.findMany({
    where: { householdId, childId, child: { deletedAt: null } },
    orderBy: [{ periodStart: "desc" }, { updatedAt: "desc" }]
  });
}

export function findDocumentForHousehold(client: DocumentRepositoryClient, householdId: string, documentId: string) {
  return client.kindergartenDocument.findFirst({
    where: { id: documentId, householdId, child: { deletedAt: null } }
  });
}

export function upsertDocumentWithAudit(
  client: DocumentRepositoryClient,
  householdId: string,
  values: StoredDocumentValues,
  actorId: string
): Promise<UpsertDocumentResult | null> {
  return withSerializableRetry(() => client.$transaction(async (transaction) => {
    const child = await transaction.child.findFirst({
      where: { id: values.childId, householdId, deletedAt: null },
      select: { id: true }
    });
    if (!child) return null;

    const date = periodDate(values.periodStart);
    const existing = await transaction.kindergartenDocument.findFirst({
      where: { householdId, childId: values.childId, type: values.type, periodStart: date }
    });
    const data = {
      householdId,
      childId: values.childId,
      type: values.type,
      periodStart: date,
      originalFileName: values.originalFileName,
      storageKey: values.storageKey,
      mimeType: values.mimeType,
      sizeBytes: values.sizeBytes
    };
    const document = existing
      ? await transaction.kindergartenDocument.update({ where: { id: existing.id }, data })
      : await transaction.kindergartenDocument.create({ data });
    await transaction.auditLog.create({ data: {
      householdId,
      actorId,
      action: existing ? "UPDATE" : "CREATE",
      entityType: "KindergartenDocument",
      entityId: document.id,
      metadata: auditMetadata(values.type, values.periodStart, ["image", "periodStart", "type"])
    } });
    return {
      document,
      created: !existing,
      replacedStorageKey: existing?.storageKey ?? null
    };
  }, transactionOptions));
}

export function deleteDocumentWithAudit(
  client: DocumentRepositoryClient,
  householdId: string,
  documentId: string,
  actorId: string
): Promise<{ deletedStorageKey: string } | null> {
  return withSerializableRetry(() => client.$transaction(async (transaction) => {
    const existing = await transaction.kindergartenDocument.findFirst({
      where: { id: documentId, householdId, child: { deletedAt: null } }
    });
    if (!existing) return null;
    await transaction.kindergartenDocument.delete({ where: { id: existing.id } });
    await transaction.auditLog.create({ data: {
      householdId,
      actorId,
      action: "DELETE",
      entityType: "KindergartenDocument",
      entityId: existing.id,
      metadata: auditMetadata(existing.type, existing.periodStart.toISOString().slice(0, 10), ["image"])
    } });
    return { deletedStorageKey: existing.storageKey };
  }, transactionOptions));
}
