import { beforeEach, describe, expect, it, vi } from "vitest";
import { issueSession, type SessionRecord, type SessionRepository } from "@/modules/auth/auth-service";
import { SESSION_COOKIE_NAME } from "@/modules/auth/auth-constants";
import { createSleepHandlers, type SleepHandlerDependencies } from "./sleep-handlers";

function sessions(): SessionRepository {
  const values: SessionRecord[] = [];
  return {
    async create(value) { values.push(value); },
    async findByTokenDigest(digest) { return values.find((value) => value.tokenDigest === digest) ?? null; },
    async revokeByTokenDigest() {}
  };
}

describe("sleep handlers", () => {
  let dependencies: SleepHandlerDependencies;
  let cookie: string;
  beforeEach(async () => {
    const repository = sessions();
    const issued = await issueSession("household-1", repository);
    cookie = `${SESSION_COOKIE_NAME}=${issued.token}`;
    dependencies = {
      sessions: repository,
      actorId: "parent@example.com",
      sleep: {
        list: vi.fn().mockResolvedValue([{ id: "sleep-1", householdId: "household-1", childId: "child-1", kind: "NIGHT", startedAt: new Date("2026-10-19T13:00:00Z"), endedAt: new Date("2026-10-19T21:00:00Z"), awakeMinutes: 30, wakeCount: 2, observation: null, source: "HOME", createdAt: new Date(), updatedAt: new Date(), deletedAt: null }]),
        find: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), restore: vi.fn(),
        timeZone: vi.fn().mockResolvedValue("Asia/Shanghai")
      }
    };
  });

  it("returns net duration and timezone-aware summaries", async () => {
    const response = await createSleepHandlers(dependencies).list(
      new Request("https://growlog.test/api/children/child-1/sleep?asOf=2026-10-20", { headers: { cookie } }),
      "child-1"
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ data: {
      sessions: [{ id: "sleep-1", sleepMinutes: 450 }],
      summary: { last7DaysMinutes: 450, last30DaysMinutes: 450 }
    } });
  });
});
