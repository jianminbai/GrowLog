import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  createActivityWithAudit,
  listActivitiesForChild,
  restoreActivityWithAudit,
  softDeleteActivityWithAudit,
  updateActivityWithAudit
} from "@/modules/activity/activity-repository";

const databaseUrl = process.env.DATABASE_URL;
const suite = databaseUrl?.includes("growlog_test") ? describe : describe.skip;
let prisma: PrismaClient;

async function clean() {
  await prisma.adminSession.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.emotionRecord.deleteMany();
  await prisma.physicalActivity.deleteMany();
  await prisma.mealItem.deleteMany();
  await prisma.meal.deleteMany();
  await prisma.beverageIntake.deleteMany();
  await prisma.sleepSession.deleteMany();
  await prisma.growthMeasurement.deleteMany();
  await prisma.child.deleteMany();
  await prisma.household.deleteMany();
}

suite("household-scoped activity persistence", () => {
  beforeAll(() => { prisma = new PrismaClient({ datasourceUrl: databaseUrl }); });
  beforeEach(clean);
  afterAll(async () => { await clean(); await prisma.$disconnect(); });

  it("enforces ownership and records the complete lifecycle", async () => {
    const [owner, other] = await Promise.all([
      prisma.household.create({ data: { name: "Owner", timeZone: "Asia/Shanghai" } }),
      prisma.household.create({ data: { name: "Other" } })
    ]);
    const child = await prisma.child.create({ data: {
      householdId: owner.id, name: "小满", birthDate: new Date("2022-05-12T00:00:00.000Z")
    } });
    const values = {
      activityType: "骑车",
      durationMinutes: 45,
      outdoorMinutes: 40,
      intensity: "MODERATE" as const,
      structure: "FREE_PLAY" as const,
      occurredAt: new Date("2026-10-20T08:00:00.000Z"),
      engagement: "主动参与",
      source: "HOME" as const
    };

    await expect(createActivityWithAudit(prisma, other.id, child.id, values, "other"))
      .resolves.toBeNull();
    const record = await createActivityWithAudit(prisma, owner.id, child.id, values, "parent");
    await expect(listActivitiesForChild(prisma, other.id, child.id)).resolves.toEqual([]);
    await expect(updateActivityWithAudit(
      prisma, owner.id, child.id, record!.id, { durationMinutes: 50 }, "parent"
    )).resolves.toMatchObject({ durationMinutes: 50 });
    await expect(softDeleteActivityWithAudit(prisma, owner.id, child.id, record!.id, "parent"))
      .resolves.toMatchObject({ deletedAt: expect.any(Date) });
    await expect(listActivitiesForChild(prisma, owner.id, child.id)).resolves.toEqual([]);
    await expect(restoreActivityWithAudit(prisma, owner.id, child.id, record!.id, "parent"))
      .resolves.toMatchObject({ deletedAt: null });

    const audits = await prisma.auditLog.findMany({
      where: { entityId: record!.id }, orderBy: { createdAt: "asc" }
    });
    expect(audits.map((entry) => entry.action)).toEqual(["CREATE", "UPDATE", "DELETE", "RESTORE"]);
    expect(JSON.stringify(audits)).not.toContain("主动参与");
  });
});
