import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { listAuditEvents, listHistoryEntries } from "@/modules/history/history-repository";

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

suite("unified household history", () => {
  beforeAll(() => { prisma = new PrismaClient({ datasourceUrl: databaseUrl }); });
  beforeEach(clean);
  afterAll(async () => { await clean(); await prisma.$disconnect(); });

  it("isolates households, filters deleted records, and returns only redacted audit fields", async () => {
    const [owner, other] = await Promise.all([
      prisma.household.create({ data: { name: "Owner" } }),
      prisma.household.create({ data: { name: "Other" } })
    ]);
    const [child, otherChild] = await Promise.all([
      prisma.child.create({ data: { householdId: owner.id, name: "小满", birthDate: new Date("2022-05-12") } }),
      prisma.child.create({ data: { householdId: other.id, name: "Other", birthDate: new Date("2022-05-12") } })
    ]);
    const growth = await prisma.growthMeasurement.create({ data: {
      householdId: owner.id, childId: child.id, measuredAt: new Date("2026-10-19T01:00:00Z"),
      heightCm: 101.2, source: "HOME"
    } });
    const activity = await prisma.physicalActivity.create({ data: {
      householdId: owner.id, childId: child.id, activityType: "骑车", durationMinutes: 30,
      outdoorMinutes: 20, intensity: "MODERATE", structure: "FREE_PLAY",
      occurredAt: new Date("2026-10-20T01:00:00Z"), source: "HOME", deletedAt: new Date()
    } });
    await prisma.emotionRecord.create({ data: {
      householdId: other.id, childId: otherChild.id, mood: "CALM", tags: [],
      occurredAt: new Date("2026-10-21T01:00:00Z"), source: "HOME"
    } });
    await prisma.auditLog.create({ data: {
      householdId: owner.id, actorId: "parent@example.com", action: "UPDATE",
      entityType: "GrowthMeasurement", entityId: growth.id,
      metadata: { changedFields: ["heightCm"], forbiddenValue: "private note" }
    } });

    await expect(listHistoryEntries(prisma, owner.id, false)).resolves.toMatchObject([
      { id: growth.id, kind: "GROWTH", childName: "小满", deletedAt: null }
    ]);
    const includingDeleted = await listHistoryEntries(prisma, owner.id, true);
    expect(includingDeleted.map((entry) => entry.id)).toEqual([activity.id, growth.id]);
    expect(JSON.stringify(includingDeleted)).not.toContain("Other");

    await expect(listAuditEvents(prisma, owner.id, 20)).resolves.toEqual([
      expect.objectContaining({
        actorId: "parent@example.com", action: "UPDATE", entityType: "GrowthMeasurement",
        changedFields: ["heightCm"]
      })
    ]);
    expect(JSON.stringify(await listAuditEvents(prisma, owner.id, 20))).not.toContain("private note");
  });
});
