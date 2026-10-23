import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  createGrowthWithAudit,
  listGrowthForChild,
  restoreGrowthWithAudit,
  softDeleteGrowthWithAudit,
  updateGrowthWithAudit
} from "@/modules/growth/growth-repository";

const databaseUrl = process.env.DATABASE_URL;
const databaseSuite = databaseUrl?.includes("growlog_test") ? describe : describe.skip;
let prisma: PrismaClient;

databaseSuite("household-scoped growth persistence", () => {
  beforeAll(() => {
    prisma = new PrismaClient({ datasourceUrl: databaseUrl });
  });

  beforeEach(async () => {
    await prisma.adminSession.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.sleepSession.deleteMany();
    await prisma.growthMeasurement.deleteMany();
    await prisma.kindergartenDocument.deleteMany(); await prisma.child.deleteMany();
    await prisma.household.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates and lists records only for the owning household and child", async () => {
    const [owner, other] = await Promise.all([
      prisma.household.create({ data: { name: "Owner" } }),
      prisma.household.create({ data: { name: "Other" } })
    ]);
    const child = await prisma.child.create({
      data: {
        householdId: owner.id,
        name: "小满",
        birthDate: new Date("2022-05-12T00:00:00.000Z")
      }
    });

    await expect(
      createGrowthWithAudit(
        prisma,
        {
          householdId: other.id,
          childId: child.id,
          measuredAt: new Date("2026-10-20T08:30:00.000Z"),
          heightCm: 110.4,
          weightKg: 18.25,
          source: "HOME"
        },
        "other@example.com"
      )
    ).resolves.toBeNull();

    const record = await createGrowthWithAudit(
      prisma,
      {
        householdId: owner.id,
        childId: child.id,
        measuredAt: new Date("2026-10-20T08:30:00.000Z"),
        heightCm: 110.4,
        weightKg: 18.25,
        source: "HOME",
        method: "站立测量"
      },
      "parent@example.com"
    );

    expect(record?.heightCm?.toNumber()).toBe(110.4);
    await expect(listGrowthForChild(prisma, owner.id, child.id)).resolves.toHaveLength(1);
    await expect(listGrowthForChild(prisma, other.id, child.id)).resolves.toEqual([]);
    await expect(prisma.auditLog.findFirstOrThrow({ where: { entityId: record!.id } })).resolves
      .toMatchObject({
        action: "CREATE",
        metadata: {
          changedFields: ["heightCm", "measuredAt", "method", "source", "weightKg"]
        }
      });
  });

  it("updates, soft deletes, and restores with audit history", async () => {
    const household = await prisma.household.create({ data: { name: "Owner" } });
    const other = await prisma.household.create({ data: { name: "Other" } });
    const child = await prisma.child.create({
      data: {
        householdId: household.id,
        name: "小满",
        birthDate: new Date("2022-05-12T00:00:00.000Z")
      }
    });
    const record = await createGrowthWithAudit(
      prisma,
      {
        householdId: household.id,
        childId: child.id,
        measuredAt: new Date("2026-10-20T08:30:00.000Z"),
        heightCm: 110,
        source: "HOME"
      },
      "parent@example.com"
    );

    await expect(
      updateGrowthWithAudit(
        prisma,
        other.id,
        child.id,
        record!.id,
        { heightCm: 999 },
        "other@example.com"
      )
    ).resolves.toBeNull();
    await expect(
      updateGrowthWithAudit(
        prisma,
        household.id,
        child.id,
        record!.id,
        { heightCm: 111.2, notes: "复测" },
        "parent@example.com"
      )
    ).resolves.toMatchObject({ notes: "复测" });
    await expect(
      softDeleteGrowthWithAudit(
        prisma,
        household.id,
        child.id,
        record!.id,
        "parent@example.com",
        new Date("2026-10-21T02:00:00.000Z")
      )
    ).resolves.toMatchObject({ deletedAt: new Date("2026-10-21T02:00:00.000Z") });
    await expect(listGrowthForChild(prisma, household.id, child.id)).resolves.toEqual([]);
    await expect(listGrowthForChild(prisma, household.id, child.id, true)).resolves.toHaveLength(1);
    await expect(
      restoreGrowthWithAudit(
        prisma,
        household.id,
        child.id,
        record!.id,
        "parent@example.com"
      )
    ).resolves.toMatchObject({ deletedAt: null });

    const audits = await prisma.auditLog.findMany({
      where: { entityId: record!.id },
      orderBy: { createdAt: "asc" }
    });
    expect(audits.map((audit) => audit.action)).toEqual(["CREATE", "UPDATE", "DELETE", "RESTORE"]);
    expect(audits[1]?.metadata).toEqual({ changedFields: ["heightCm", "notes"] });
  });
});
