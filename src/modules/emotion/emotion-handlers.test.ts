import { beforeEach, describe, expect, it, vi } from "vitest";

import { SESSION_COOKIE_NAME } from "@/modules/auth/auth-constants";
import { issueSession, type SessionRecord, type SessionRepository } from "@/modules/auth/auth-service";

import { createEmotionHandlers, type EmotionHandlerDependencies } from "./emotion-handlers";

function sessions(): SessionRepository {
  const values: SessionRecord[] = [];
  return {
    async create(value) { values.push(value); },
    async findByTokenDigest(digest) { return values.find((value) => value.tokenDigest === digest) ?? null; },
    async revokeByTokenDigest() {}
  };
}

describe("emotion handlers", () => {
  let dependencies: EmotionHandlerDependencies;
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
      emotion: {
        list: vi.fn().mockResolvedValue([{
          id: "emotion-1", householdId: "household-1", childId: "child-1",
          mood: "CALM", tags: ["入园"], context: null, durationMinutes: 20,
          peerInteraction: null, parentInteraction: null, notes: null,
          occurredAt: new Date("2026-10-19T16:30:00.000Z"), source: "HOME",
          createdAt: new Date(), updatedAt: new Date(), deletedAt: null
        }]),
        create: vi.fn(), update: vi.fn(), remove: vi.fn(), restore: vi.fn(),
        timeZone: vi.fn().mockResolvedValue("Asia/Shanghai")
      }
    };
  });

  it("returns descriptive timezone-aware counts without a score", async () => {
    const response = await createEmotionHandlers(dependencies).list(new Request(
      "https://growlog.test/api/children/child-1/emotions?asOf=2026-10-20",
      { headers: { cookie } }
    ), "child-1");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ data: {
      emotions: [{ id: "emotion-1", mood: "CALM" }],
      summary: { last7Days: { total: 1, byMood: { CALM: 1 }, byTag: { 入园: 1 } } }
    } });
    expect(JSON.stringify(body)).not.toContain("score");
  });

  it("validates a mutation before persistence", async () => {
    const response = await createEmotionHandlers(dependencies).create(new Request(
      "https://growlog.test/api/children/child-1/emotions",
      {
        method: "POST",
        headers: { cookie, "content-type": "application/json", "x-csrf-token": csrfToken },
        body: JSON.stringify({
          mood: "CALM", durationMinutes: 0,
          occurredAt: "2026-10-20T01:00:00.000Z", source: "HOME"
        })
      }
    ), "child-1");

    expect(response.status).toBe(400);
    expect(dependencies.emotion.create).not.toHaveBeenCalled();
  });
});
