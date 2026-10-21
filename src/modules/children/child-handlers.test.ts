import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CSRF_COOKIE_NAME, SESSION_COOKIE_NAME } from "@/modules/auth/auth-constants";
import { issueSession, type SessionRecord, type SessionRepository } from "@/modules/auth/auth-service";

import { createChildHandlers, type ChildHandlerDependencies } from "./child-handlers";

function sessionRepository(): SessionRepository {
  const records: SessionRecord[] = [];
  return {
    async create(record) {
      records.push(record);
    },
    async findByTokenDigest(tokenDigest) {
      return records.find((record) => record.tokenDigest === tokenDigest) ?? null;
    },
    async revokeByTokenDigest() {}
  };
}

const storedChild = {
  id: "child-1",
  householdId: "household-1",
  name: "小满",
  birthDate: new Date("2022-05-12T00:00:00.000Z"),
  sex: "FEMALE" as const,
  birthHeightCm: new Prisma.Decimal(49.5),
  birthWeightKg: new Prisma.Decimal(3.26),
  motherHeightCm: null,
  fatherHeightCm: null,
  notes: null,
  createdAt: new Date("2026-10-21T00:00:00.000Z"),
  updatedAt: new Date("2026-10-21T00:00:00.000Z"),
  deletedAt: null
};

describe("child profile handlers", () => {
  let dependencies: ChildHandlerDependencies;
  let cookie: string;
  let csrfToken: string;

  beforeEach(async () => {
    const sessions = sessionRepository();
    const issued = await issueSession("household-1", sessions);
    cookie = `${SESSION_COOKIE_NAME}=${issued.token}; ${CSRF_COOKIE_NAME}=${issued.csrfToken}`;
    csrfToken = issued.csrfToken;
    dependencies = {
      sessions,
      actorId: "parent@example.com",
      children: {
        list: vi.fn().mockResolvedValue([storedChild]),
        find: vi.fn().mockResolvedValue(storedChild),
        create: vi.fn().mockResolvedValue(storedChild),
        update: vi.fn().mockResolvedValue(storedChild)
      }
    };
  });

  it("rejects anonymous list access", async () => {
    const response = await createChildHandlers(dependencies).list(
      new Request("https://growlog.test/api/children")
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "UNAUTHORIZED" } });
  });

  it("requires CSRF before validating a create mutation", async () => {
    const response = await createChildHandlers(dependencies).create(
      new Request("https://growlog.test/api/children", {
        method: "POST",
        headers: { cookie, origin: "https://growlog.test", "content-type": "application/json" },
        body: JSON.stringify({ name: "", birthDate: "invalid" })
      })
    );

    expect(response.status).toBe(403);
    expect(dependencies.children.create).not.toHaveBeenCalled();
  });

  it("validates and creates a profile for the authenticated household", async () => {
    const response = await createChildHandlers(dependencies).create(
      new Request("https://growlog.test/api/children", {
        method: "POST",
        headers: {
          cookie,
          origin: "https://growlog.test",
          "content-type": "application/json",
          "x-csrf-token": csrfToken
        },
        body: JSON.stringify({ name: " 小满 ", birthDate: "2022-05-12", sex: "FEMALE" })
      })
    );

    expect(response.status).toBe(201);
    expect(dependencies.children.create).toHaveBeenCalledWith(
      "household-1",
      expect.objectContaining({
        name: "小满",
        birthDate: new Date("2022-05-12T00:00:00.000Z"),
        sex: "FEMALE"
      }),
      "parent@example.com"
    );
    await expect(response.json()).resolves.toMatchObject({
      data: { child: { id: "child-1", birthDate: "2022-05-12", birthHeightCm: 49.5 } }
    });
  });

  it("returns a generic not-found response for an out-of-household update", async () => {
    dependencies.children.update = vi.fn().mockResolvedValue(null);
    const response = await createChildHandlers(dependencies).update(
      new Request("https://growlog.test/api/children/child-other", {
        method: "PATCH",
        headers: {
          cookie,
          origin: "https://growlog.test",
          "content-type": "application/json",
          "x-csrf-token": csrfToken
        },
        body: JSON.stringify({ name: "New name" })
      }),
      "child-other"
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "NOT_FOUND" } });
  });
});
