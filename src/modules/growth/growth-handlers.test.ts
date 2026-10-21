import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CSRF_COOKIE_NAME, SESSION_COOKIE_NAME } from "@/modules/auth/auth-constants";
import { issueSession, type SessionRecord, type SessionRepository } from "@/modules/auth/auth-service";

import { createGrowthHandlers, type GrowthHandlerDependencies } from "./growth-handlers";

function sessionRepository(): SessionRepository {
  const records: SessionRecord[] = [];
  return {
    async create(record) { records.push(record); },
    async findByTokenDigest(digest) {
      return records.find((record) => record.tokenDigest === digest) ?? null;
    },
    async revokeByTokenDigest() {}
  };
}

function record(id: string, heightCm: number | null, weightKg: number | null) {
  return {
    id,
    householdId: "household-1",
    childId: "child-1",
    measuredAt: new Date(`2026-10-${id === "growth-1" ? "19" : "20"}T08:00:00.000Z`),
    heightCm: heightCm === null ? null : new Prisma.Decimal(heightCm),
    weightKg: weightKg === null ? null : new Prisma.Decimal(weightKg),
    headCircumferenceCm: null,
    source: "HOME" as const,
    place: null,
    method: null,
    device: null,
    precisionNote: null,
    notes: null,
    createdAt: new Date("2026-10-21T00:00:00.000Z"),
    updatedAt: new Date("2026-10-21T00:00:00.000Z"),
    deletedAt: null
  };
}

describe("growth handlers", () => {
  let dependencies: GrowthHandlerDependencies;
  let cookie: string;
  let csrf: string;

  beforeEach(async () => {
    const sessions = sessionRepository();
    const issued = await issueSession("household-1", sessions);
    cookie = `${SESSION_COOKIE_NAME}=${issued.token}; ${CSRF_COOKIE_NAME}=${issued.csrfToken}`;
    csrf = issued.csrfToken;
    dependencies = {
      sessions,
      actorId: "parent@example.com",
      growth: {
        list: vi.fn().mockResolvedValue([
          record("growth-1", 110, 18),
          record("growth-2", 111, 18.5)
        ]),
        find: vi.fn().mockResolvedValue(record("growth-1", 110, 18)),
        create: vi.fn().mockResolvedValue(record("growth-2", 111, 18.5)),
        update: vi.fn().mockResolvedValue(record("growth-2", 111, 18.5)),
        remove: vi.fn().mockResolvedValue({ ...record("growth-1", 110, 18), deletedAt: new Date() }),
        restore: vi.fn().mockResolvedValue(record("growth-1", 110, 18))
      }
    };
  });

  it("serializes chronological history with BMI and prior changes", async () => {
    const response = await createGrowthHandlers(dependencies).list(
      new Request("https://growlog.test/api/children/child-1/growth", { headers: { cookie } }),
      "child-1"
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        measurements: [
          { id: "growth-1", bmi: 14.88, heightChangeCm: null, weightChangeKg: null },
          { id: "growth-2", bmi: 15.02, heightChangeCm: 1, weightChangeKg: 0.5 }
        ]
      }
    });
  });

  it("rejects invalid create data before persistence", async () => {
    const response = await createGrowthHandlers(dependencies).create(
      new Request("https://growlog.test/api/children/child-1/growth", {
        method: "POST",
        headers: {
          cookie,
          origin: "https://growlog.test",
          "content-type": "application/json",
          "x-csrf-token": csrf
        },
        body: JSON.stringify({ measuredAt: "invalid", source: "HOME" })
      }),
      "child-1"
    );

    expect(response.status).toBe(400);
    expect(dependencies.growth.create).not.toHaveBeenCalled();
  });

  it("soft deletes and restores only with authenticated CSRF", async () => {
    const handlers = createGrowthHandlers(dependencies);
    const forbidden = await handlers.remove(
      new Request("https://growlog.test/api/children/child-1/growth/growth-1", {
        method: "DELETE",
        headers: { cookie, origin: "https://growlog.test" }
      }),
      "child-1",
      "growth-1"
    );
    expect(forbidden.status).toBe(403);

    const restored = await handlers.restore(
      new Request("https://growlog.test/api/children/child-1/growth/growth-1/restore", {
        method: "POST",
        headers: { cookie, origin: "https://growlog.test", "x-csrf-token": csrf }
      }),
      "child-1",
      "growth-1"
    );
    expect(restored.status).toBe(200);
    expect(dependencies.growth.restore).toHaveBeenCalledWith(
      "household-1",
      "child-1",
      "growth-1",
      "parent@example.com"
    );
  });
});
