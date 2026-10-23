import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  createEmotionWithAudit,
  listEmotionsForChild,
  restoreEmotionWithAudit,
  softDeleteEmotionWithAudit,
  updateEmotionWithAudit
} from "@/modules/emotion/emotion-repository";

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
  await prisma.kindergartenDocument.deleteMany(); await prisma.child.deleteMany();
  await prisma.household.deleteMany();
}

suite("household-scoped emotion persistence", () => {
  beforeAll(() => { prisma = new PrismaClient({ datasourceUrl: databaseUrl }); });
  beforeEach(clean);
  afterAll(async () => { await clean(); await prisma.$disconnect(); });

  it("enforces ownership and records a redacted lifecycle audit trail", async () => {
    const [owner, other] = await Promise.all([
      prisma.household.create({ data: { name: "Owner" } }),
      prisma.household.create({ data: { name: "Other" } })
    ]);
    const child = await prisma.child.create({ data: {
      householdId: owner.id, name: "小满", birthDate: new Date("2022-05-12T00:00:00.000Z")
    } });
    const values = {
      mood: "CALM" as const,
      tags: ["入园", "同伴"],
      context: "早晨入园",
      durationMinutes: 20,
      peerInteraction: "主动打招呼",
      parentInteraction: null,
      notes: "仅为家长观察",
      occurredAt: new Date("2026-10-20T01:00:00.000Z"),
      source: "HOME" as const
    };

    await expect(createEmotionWithAudit(prisma, other.id, child.id, values, "other"))
      .resolves.toBeNull();
    const record = await createEmotionWithAudit(prisma, owner.id, child.id, values, "parent");
    await expect(listEmotionsForChild(prisma, other.id, child.id)).resolves.toEqual([]);
    await expect(updateEmotionWithAudit(
      prisma, owner.id, child.id, record!.id, { mood: "HAPPY" }, "parent"
    )).resolves.toMatchObject({ mood: "HAPPY" });
    await expect(softDeleteEmotionWithAudit(prisma, owner.id, child.id, record!.id, "parent"))
      .resolves.toMatchObject({ deletedAt: expect.any(Date) });
    await expect(listEmotionsForChild(prisma, owner.id, child.id)).resolves.toEqual([]);
    await expect(restoreEmotionWithAudit(prisma, owner.id, child.id, record!.id, "parent"))
      .resolves.toMatchObject({ deletedAt: null });

    const audits = await prisma.auditLog.findMany({
      where: { entityId: record!.id }, orderBy: { createdAt: "asc" }
    });
    expect(audits.map((entry) => entry.action)).toEqual(["CREATE", "UPDATE", "DELETE", "RESTORE"]);
    expect(JSON.stringify(audits)).not.toContain("早晨入园");
    expect(JSON.stringify(audits)).not.toContain("仅为家长观察");
  });
});
