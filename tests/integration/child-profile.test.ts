import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  createChildWithAudit,
  listChildrenForHousehold,
  updateChildWithAudit
} from "@/modules/children/child-repository";

const databaseUrl = process.env.DATABASE_URL;
const databaseSuite = databaseUrl?.includes("growlog_test") ? describe : describe.skip;
let prisma: PrismaClient;

databaseSuite("complete child profile persistence", () => {
  beforeAll(() => {
    prisma = new PrismaClient({ datasourceUrl: databaseUrl });
  });

  beforeEach(async () => {
    await prisma.adminSession.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.sleepSession.deleteMany();
    await prisma.growthMeasurement.deleteMany();
    await prisma.child.deleteMany();
    await prisma.household.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("stores optional measurements and lists only the household's active profiles", async () => {
    const [owner, other] = await Promise.all([
      prisma.household.create({ data: { name: "Owner" } }),
      prisma.household.create({ data: { name: "Other" } })
    ]);

    const child = await createChildWithAudit(
      prisma,
      {
        householdId: owner.id,
        name: "小满",
        birthDate: new Date("2022-05-12T00:00:00.000Z"),
        sex: "FEMALE",
        birthHeightCm: 49.5,
        birthWeightKg: 3.26,
        motherHeightCm: 165,
        fatherHeightCm: 178.5,
        notes: "足月出生"
      },
      "parent@example.com"
    );
    await prisma.child.create({
      data: {
        householdId: other.id,
        name: "Other child",
        birthDate: new Date("2021-01-01T00:00:00.000Z")
      }
    });

    expect(child.birthHeightCm?.toNumber()).toBe(49.5);
    expect(child.birthWeightKg?.toNumber()).toBe(3.26);
    await expect(listChildrenForHousehold(prisma, owner.id)).resolves.toMatchObject([
      { id: child.id, name: "小满" }
    ]);
    await expect(listChildrenForHousehold(prisma, other.id)).resolves.toHaveLength(1);

    const audit = await prisma.auditLog.findFirstOrThrow({ where: { entityId: child.id } });
    expect(audit.metadata).toEqual({
      changedFields: [
        "birthDate",
        "birthHeightCm",
        "birthWeightKg",
        "fatherHeightCm",
        "motherHeightCm",
        "name",
        "notes",
        "sex"
      ]
    });
  });

  it("updates within the owner household and appends redacted audit metadata", async () => {
    const [owner, other] = await Promise.all([
      prisma.household.create({ data: { name: "Owner" } }),
      prisma.household.create({ data: { name: "Other" } })
    ]);
    const child = await createChildWithAudit(
      prisma,
      {
        householdId: owner.id,
        name: "Before",
        birthDate: new Date("2020-03-02T00:00:00.000Z"),
        sex: "UNSPECIFIED"
      },
      "parent@example.com"
    );

    await expect(
      updateChildWithAudit(
        prisma,
        other.id,
        child.id,
        { name: "Leaked" },
        "other@example.com"
      )
    ).resolves.toBeNull();
    await expect(
      updateChildWithAudit(
        prisma,
        owner.id,
        child.id,
        { name: "After", notes: "Updated note" },
        "parent@example.com"
      )
    ).resolves.toMatchObject({ name: "After", notes: "Updated note" });

    const audits = await prisma.auditLog.findMany({
      where: { entityType: "Child", entityId: child.id },
      orderBy: { createdAt: "asc" }
    });
    expect(audits).toHaveLength(2);
    expect(audits[1]).toMatchObject({
      householdId: owner.id,
      actorId: "parent@example.com",
      action: "UPDATE",
      metadata: { changedFields: ["name", "notes"] }
    });
    expect(JSON.stringify(audits[1]?.metadata)).not.toContain("Updated note");
  });
});
