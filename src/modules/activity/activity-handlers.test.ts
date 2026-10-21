import { beforeEach, describe, expect, it, vi } from "vitest";

import { SESSION_COOKIE_NAME } from "@/modules/auth/auth-constants";
import { issueSession, type SessionRecord, type SessionRepository } from "@/modules/auth/auth-service";

import { createActivityHandlers, type ActivityHandlerDependencies } from "./activity-handlers";

function sessions(): SessionRepository {
  const values: SessionRecord[] = [];
  return {
    async create(value) { values.push(value); },
    async findByTokenDigest(digest) { return values.find((value) => value.tokenDigest === digest) ?? null; },
    async revokeByTokenDigest() {}
  };
}

describe("activity handlers", () => {
  let dependencies: ActivityHandlerDependencies;
  let cookie: string;
  let csrfToken: string;

  beforeEach(async () => {
    const repository = sessions();
    const issued = await issueSession("household-1", repository);
    cookie = `${SESSION_COOKIE_NAME}=${issued.token}`;
    csrfToken = issued.csrfToken;
    dependencies = {
      sessions: repository,
      actorId: "parent@example.com",
      activity: {
        list: vi.fn().mockResolvedValue([{
          id: "activity-1", householdId: "household-1", childId: "child-1",
          activityType: "散步", durationMinutes: 60, outdoorMinutes: 50,
          intensity: "LIGHT", structure: "FREE_PLAY",
          occurredAt: new Date("2026-10-19T16:30:00.000Z"), engagement: null,
          notes: null, source: "HOME", createdAt: new Date(), updatedAt: new Date(), deletedAt: null
        }]),
        find: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), restore: vi.fn(),
        timeZone: vi.fn().mockResolvedValue("Asia/Shanghai")
      }
    };
  });

  it("returns a timezone-aware weekly summary with independent outdoor totals", async () => {
    const response = await createActivityHandlers(dependencies).list(new Request(
      "https://growlog.test/api/children/child-1/activities?asOf=2026-10-20",
      { headers: { cookie } }
    ), "child-1");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ data: {
      activities: [{ id: "activity-1", outdoorMinutes: 50 }],
      summary: { last7Days: { totalMinutes: 60, outdoorMinutes: 50, moderateVigorousMinutes: 0 } }
    } });
  });

  it("rejects outdoor time greater than total time before persistence", async () => {
    const response = await createActivityHandlers(dependencies).create(new Request(
      "https://growlog.test/api/children/child-1/activities",
      {
        method: "POST",
        headers: { cookie, "content-type": "application/json", "x-csrf-token": csrfToken },
        body: JSON.stringify({
          activityType: "跑步", durationMinutes: 20, outdoorMinutes: 30,
          intensity: "VIGOROUS", structure: "STRUCTURED",
          occurredAt: "2026-10-20T08:00:00.000Z", source: "HOME"
        })
      }
    ), "child-1");

    expect(response.status).toBe(400);
    expect(dependencies.activity.create).not.toHaveBeenCalled();
  });
});
