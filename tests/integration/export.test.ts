import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { buildHouseholdExport, exportDomainCsv } from "@/modules/export/export-service";

const databaseUrl = process.env.DATABASE_URL;
const suite = databaseUrl?.includes("growlog_test") ? describe : describe.skip;
let prisma: PrismaClient;

async function clean() {
  await prisma.adminSession.deleteMany(); await prisma.auditLog.deleteMany();
  await prisma.emotionRecord.deleteMany(); await prisma.physicalActivity.deleteMany();
  await prisma.mealItem.deleteMany(); await prisma.meal.deleteMany(); await prisma.beverageIntake.deleteMany();
  await prisma.sleepSession.deleteMany(); await prisma.growthMeasurement.deleteMany();
  await prisma.child.deleteMany(); await prisma.household.deleteMany();
}

suite("household export", () => {
  beforeAll(() => { prisma = new PrismaClient({ datasourceUrl: databaseUrl }); });
  beforeEach(clean);
  afterAll(async () => { await clean(); await prisma.$disconnect(); });

  it("versions JSON, isolates households, and includes deleted rows only when requested", async () => {
    const [owner, other] = await Promise.all([
      prisma.household.create({ data: { name: "Owner", timeZone: "Asia/Shanghai" } }),
      prisma.household.create({ data: { name: "Other" } })
    ]);
    const [child, otherChild] = await Promise.all([
      prisma.child.create({ data: { householdId: owner.id, name: "小满", birthDate: new Date("2022-05-12") } }),
      prisma.child.create({ data: { householdId: other.id, name: "Hidden", birthDate: new Date("2022-05-12") } })
    ]);
    await prisma.growthMeasurement.createMany({ data: [
      { householdId: owner.id, childId: child.id, measuredAt: new Date("2026-10-20T01:00:00Z"), heightCm: 101.2, source: "HOME", notes: "line 1, \"quoted\"\nline 2" },
      { householdId: owner.id, childId: child.id, measuredAt: new Date("2026-10-19T01:00:00Z"), weightKg: 15.8, source: "HOME", deletedAt: new Date() },
      { householdId: other.id, childId: otherChild.id, measuredAt: new Date(), heightCm: 99, source: "HOME" }
    ] });

    const active = await buildHouseholdExport(prisma, owner.id, false, new Date("2026-10-21T00:00:00Z"));
    expect(active).toMatchObject({ exportVersion: 1, exportedAt: "2026-10-21T00:00:00.000Z", household: { id: owner.id }, growth: [{ heightCm: 101.2 }] });
    expect(active.growth).toHaveLength(1);
    expect(JSON.stringify(active)).not.toContain("Hidden");

    const all = await buildHouseholdExport(prisma, owner.id, true, new Date("2026-10-21T00:00:00Z"));
    expect(all.growth).toHaveLength(2);
    const csv = exportDomainCsv(active, "growth");
    expect(csv).toContain("height_cm,weight_kg");
    expect(csv).toContain('"line 1, ""quoted""\nline 2"');
    expect(csv).not.toContain("Hidden");
  });
});
