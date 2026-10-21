import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  createChildWithAudit,
  findChildForHousehold
} from "@/modules/children/child-repository";
import { issueSession, resolveSession, revokeSession } from "@/modules/auth/auth-service";
import { createSessionRepository } from "@/modules/auth/session-repository";

const databaseUrl = process.env.DATABASE_URL;
const databaseSuite = databaseUrl?.includes("growlog_test") ? describe : describe.skip;
let prisma: PrismaClient;

databaseSuite("household-scoped child persistence", () => {
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

  it("creates a child and its audit event in one operation", async () => {
    const household = await prisma.household.create({
      data: { name: "Test family", timeZone: "Asia/Shanghai" }
    });

    const child = await createChildWithAudit(
      prisma,
      {
        householdId: household.id,
        name: "Ming",
        birthDate: new Date("2022-05-12T00:00:00.000Z"),
        sex: "UNSPECIFIED"
      },
      "admin@example.com"
    );

    const audit = await prisma.auditLog.findFirstOrThrow({
      where: { entityType: "Child", entityId: child.id }
    });

    expect(child.householdId).toBe(household.id);
    expect(audit).toMatchObject({
      householdId: household.id,
      actorId: "admin@example.com",
      action: "CREATE"
    });
    expect(audit.metadata).toEqual({ changedFields: ["birthDate", "name", "sex"] });
  });

  it("does not reveal a child to another household", async () => {
    const [owner, other] = await Promise.all([
      prisma.household.create({ data: { name: "Owner" } }),
      prisma.household.create({ data: { name: "Other" } })
    ]);
    const child = await createChildWithAudit(
      prisma,
      {
        householdId: owner.id,
        name: "Lin",
        birthDate: new Date("2021-08-20T00:00:00.000Z"),
        sex: "FEMALE"
      },
      "admin@example.com"
    );

    await expect(findChildForHousehold(prisma, other.id, child.id)).resolves.toBeNull();
    await expect(findChildForHousehold(prisma, owner.id, child.id)).resolves.toMatchObject({
      id: child.id,
      name: "Lin"
    });
  });
});

databaseSuite("Prisma-backed administrator sessions", () => {
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

  it("persists only digests and supports lookup and revocation", async () => {
    const household = await prisma.household.create({ data: { name: "Session family" } });
    const repository = createSessionRepository(prisma);
    const now = new Date("2026-10-21T02:00:00.000Z");
    const randomValues = [Buffer.alloc(32, 7), Buffer.alloc(32, 8)];

    const issued = await issueSession(household.id, repository, {
      now,
      randomBytes: () => randomValues.shift() ?? Buffer.alloc(32, 9)
    });
    const stored = await prisma.adminSession.findFirstOrThrow();

    expect(stored.tokenDigest).not.toBe(issued.token);
    expect(stored.csrfTokenDigest).not.toBe(issued.csrfToken);
    await expect(resolveSession(issued.token, repository, now)).resolves.toMatchObject({
      householdId: household.id,
      tokenDigest: stored.tokenDigest
    });

    await revokeSession(issued.token, repository, now);
    await expect(prisma.adminSession.findUniqueOrThrow({ where: { id: stored.id } })).resolves
      .toMatchObject({ revokedAt: now });
  });
});
