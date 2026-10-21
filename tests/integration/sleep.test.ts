import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  createSleepWithAudit,
  listSleepForChild,
  restoreSleepWithAudit,
  softDeleteSleepWithAudit,
  updateSleepWithAudit
} from "@/modules/sleep/sleep-repository";

const databaseUrl = process.env.DATABASE_URL;
const databaseSuite = databaseUrl?.includes("growlog_test") ? describe : describe.skip;
let prisma: PrismaClient;

databaseSuite("household-scoped sleep persistence", () => {
  beforeAll(() => { prisma = new PrismaClient({ datasourceUrl: databaseUrl }); });
  beforeEach(async () => {
    await prisma.adminSession.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.sleepSession.deleteMany();
    await prisma.growthMeasurement.deleteMany();
    await prisma.child.deleteMany();
    await prisma.household.deleteMany();
  });
  afterAll(async () => { await prisma.$disconnect(); });

  it("enforces ownership and records the full lifecycle", async () => {
    const [owner, other] = await Promise.all([
      prisma.household.create({ data: { name: "Owner" } }),
      prisma.household.create({ data: { name: "Other" } })
    ]);
    const child = await prisma.child.create({ data: {
      householdId: owner.id, name: "小满", birthDate: new Date("2022-05-12T00:00:00.000Z")
    } });
    const input = {
      householdId: owner.id,
      childId: child.id,
      kind: "NIGHT" as const,
      startedAt: new Date("2026-10-19T13:00:00.000Z"),
      endedAt: new Date("2026-10-19T21:00:00.000Z"),
      awakeMinutes: 30,
      wakeCount: 2,
      source: "HOME" as const
    };

    await expect(createSleepWithAudit(prisma, { ...input, householdId: other.id }, "other"))
      .resolves.toBeNull();
    const record = await createSleepWithAudit(prisma, input, "parent@example.com");
    await expect(listSleepForChild(prisma, other.id, child.id)).resolves.toEqual([]);
    await expect(
      updateSleepWithAudit(prisma, owner.id, child.id, record!.id, { observation: "复记" }, "parent@example.com")
    ).resolves.toMatchObject({ observation: "复记" });
    await expect(
      softDeleteSleepWithAudit(prisma, owner.id, child.id, record!.id, "parent@example.com")
    ).resolves.toMatchObject({ deletedAt: expect.any(Date) });
    await expect(listSleepForChild(prisma, owner.id, child.id)).resolves.toEqual([]);
    await expect(
      restoreSleepWithAudit(prisma, owner.id, child.id, record!.id, "parent@example.com")
    ).resolves.toMatchObject({ deletedAt: null });

    const audits = await prisma.auditLog.findMany({ where: { entityId: record!.id }, orderBy: { createdAt: "asc" } });
    expect(audits.map((audit) => audit.action)).toEqual(["CREATE", "UPDATE", "DELETE", "RESTORE"]);
    expect(JSON.stringify(audits[1]?.metadata)).not.toContain("复记");
  });
});
