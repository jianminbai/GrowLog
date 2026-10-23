import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  deleteDocumentWithAudit,
  findDocumentForHousehold,
  listDocumentsForChild,
  upsertDocumentWithAudit
} from "@/modules/kindergarten-documents/document-repository";

const databaseUrl = process.env.DATABASE_URL;
const databaseSuite = databaseUrl?.includes("growlog_test") ? describe : describe.skip;
let prisma: PrismaClient;

const image = (childId: string, storageKey: string, periodStart = "2026-10-20") => ({
  childId,
  type: "DAILY_CARE_SHEET" as const,
  periodStart,
  originalFileName: "care.png",
  storageKey,
  mimeType: "image/png",
  sizeBytes: 128
});

databaseSuite("kindergarten document persistence", () => {
  beforeAll(() => {
    prisma = new PrismaClient({ datasourceUrl: databaseUrl });
  });

  beforeEach(async () => {
    await prisma.kindergartenDocument.deleteMany();
    await prisma.adminSession.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.child.deleteMany();
    await prisma.household.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function family(name = "Document family") {
    const household = await prisma.household.create({ data: { name } });
    const child = await prisma.child.create({
      data: { householdId: household.id, name: "Yu", birthDate: new Date("2022-05-12"), sex: "UNSPECIFIED" }
    });
    return { household, child };
  }

  it("creates one child-scoped period and writes a redacted audit", async () => {
    const { household, child } = await family();

    const result = await upsertDocumentWithAudit(prisma, household.id, image(child.id, "00000000-0000-4000-8000-000000000001.png"), "admin");

    expect(result).toMatchObject({ created: true, replacedStorageKey: null });
    expect(result?.document).toMatchObject({ householdId: household.id, childId: child.id, type: "DAILY_CARE_SHEET" });
    const audit = await prisma.auditLog.findFirstOrThrow({ where: { entityType: "KindergartenDocument" } });
    expect(audit).toMatchObject({ action: "CREATE", actorId: "admin", entityId: result?.document.id });
    expect(audit.metadata).toEqual({
      changedFields: ["image", "periodStart", "type"],
      periodStart: "2026-10-20",
      type: "DAILY_CARE_SHEET"
    });
    expect(JSON.stringify(audit.metadata)).not.toContain("care.png");
    expect(JSON.stringify(audit.metadata)).not.toContain("00000000");
  });

  it("replaces the same period and returns the old key for post-commit cleanup", async () => {
    const { household, child } = await family();
    const firstKey = "00000000-0000-4000-8000-000000000001.png";
    const secondKey = "00000000-0000-4000-8000-000000000002.webp";
    await upsertDocumentWithAudit(prisma, household.id, image(child.id, firstKey), "admin");

    const replacement = await upsertDocumentWithAudit(prisma, household.id, {
      ...image(child.id, secondKey), originalFileName: "care.webp", mimeType: "image/webp"
    }, "admin");

    expect(replacement).toMatchObject({ created: false, replacedStorageKey: firstKey });
    expect(await prisma.kindergartenDocument.count()).toBe(1);
    expect(replacement?.document.storageKey).toBe(secondKey);
    const audits = await prisma.auditLog.findMany({ where: { entityType: "KindergartenDocument" }, orderBy: { createdAt: "asc" } });
    expect(audits.map(({ action }) => action)).toEqual(["CREATE", "UPDATE"]);
    expect(JSON.stringify(audits[1]?.metadata)).not.toContain(secondKey);
  });

  it("lists newest periods first and hides documents for deleted or other-household children", async () => {
    const owner = await family("Owner");
    const other = await family("Other");
    const first = await upsertDocumentWithAudit(prisma, owner.household.id, image(owner.child.id, "00000000-0000-4000-8000-000000000003.png", "2026-10-19"), "admin");
    const second = await upsertDocumentWithAudit(prisma, owner.household.id, image(owner.child.id, "00000000-0000-4000-8000-000000000004.png", "2026-10-20"), "admin");

    expect((await listDocumentsForChild(prisma, owner.household.id, owner.child.id)).map(({ id }) => id)).toEqual([
      second?.document.id,
      first?.document.id
    ]);
    await expect(findDocumentForHousehold(prisma, other.household.id, first!.document.id)).resolves.toBeNull();
    await prisma.child.update({ where: { id: owner.child.id }, data: { deletedAt: new Date() } });
    await expect(listDocumentsForChild(prisma, owner.household.id, owner.child.id)).resolves.toEqual([]);
    await expect(findDocumentForHousehold(prisma, owner.household.id, first!.document.id)).resolves.toBeNull();
    await expect(upsertDocumentWithAudit(prisma, owner.household.id, image(owner.child.id, "00000000-0000-4000-8000-000000000005.png"), "admin")).resolves.toBeNull();
  });

  it("deletes metadata with a redacted audit and returns the committed storage key", async () => {
    const { household, child } = await family();
    const created = await upsertDocumentWithAudit(prisma, household.id, image(child.id, "00000000-0000-4000-8000-000000000006.png"), "admin");

    const deleted = await deleteDocumentWithAudit(prisma, household.id, created!.document.id, "admin");

    expect(deleted).toEqual({ deletedStorageKey: "00000000-0000-4000-8000-000000000006.png" });
    await expect(findDocumentForHousehold(prisma, household.id, created!.document.id)).resolves.toBeNull();
    const audit = await prisma.auditLog.findFirstOrThrow({ where: { entityId: created!.document.id, action: "DELETE" } });
    expect(audit.metadata).toEqual({ changedFields: ["image"], periodStart: "2026-10-20", type: "DAILY_CARE_SHEET" });
  });

  it("serializes concurrent replacements and leaves exactly one successful key", async () => {
    const { household, child } = await family();
    const keys = [
      "00000000-0000-4000-8000-000000000007.png",
      "00000000-0000-4000-8000-000000000008.png"
    ];

    const results = await Promise.all(keys.map((key) =>
      upsertDocumentWithAudit(prisma, household.id, image(child.id, key), "admin")
    ));

    expect(results.every(Boolean)).toBe(true);
    const rows = await prisma.kindergartenDocument.findMany();
    expect(rows).toHaveLength(1);
    expect(keys).toContain(rows[0]?.storageKey);
    expect(await prisma.auditLog.count({ where: { entityType: "KindergartenDocument" } })).toBe(2);
  });
});
