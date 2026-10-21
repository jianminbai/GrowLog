import { describe, expect, it } from "vitest";

import { emotionCreateSchema, summarizeEmotions } from "./emotion-record";

describe("emotion record rules", () => {
  it("normalizes optional observation fields and removes duplicate tags", () => {
    const parsed = emotionCreateSchema.parse({
      mood: "CALM",
      tags: [" 入园 ", "同伴互动", "入园"],
      context: "  早晨入园  ",
      durationMinutes: 20,
      peerInteraction: "  主动打招呼  ",
      parentInteraction: "  拥抱后平静  ",
      notes: "  家长观察  ",
      occurredAt: "2026-10-20T01:00:00.000Z",
      source: "HOME"
    });

    expect(parsed).toMatchObject({
      tags: ["入园", "同伴互动"],
      context: "早晨入园",
      peerInteraction: "主动打招呼",
      parentInteraction: "拥抱后平静",
      notes: "家长观察"
    });
  });

  it.each([
    { mood: "DIAGNOSED" },
    { mood: "HAPPY", durationMinutes: 0 },
    { mood: "HAPPY", tags: Array.from({ length: 13 }, (_, index) => `标签${index}`) }
  ])("rejects an invalid bounded observation: %o", (overrides) => {
    expect(emotionCreateSchema.safeParse({
      tags: [],
      occurredAt: "2026-10-20T01:00:00.000Z",
      source: "HOME",
      ...overrides
    }).success).toBe(false);
  });
});

describe("emotion trend counts", () => {
  it("counts observations by household date without turning them into a diagnostic score", () => {
    const summary = summarizeEmotions([
      { mood: "HAPPY", tags: ["户外"], occurredAt: new Date("2026-10-19T16:30:00.000Z") },
      { mood: "CALM", tags: ["户外", "同伴"], occurredAt: new Date("2026-10-20T02:00:00.000Z") },
      { mood: "SAD", tags: ["入园"], occurredAt: new Date("2026-10-12T02:00:00.000Z") }
    ], "Asia/Shanghai", "2026-10-20");

    expect(summary.last7Days).toEqual({
      total: 2,
      byMood: { HAPPY: 1, CALM: 1 },
      byTag: { 户外: 2, 同伴: 1 }
    });
    expect(summary.last30Days.total).toBe(3);
    expect(summary.daily).toEqual([{
      date: "2026-10-20",
      total: 2,
      byMood: { HAPPY: 1, CALM: 1 }
    }]);
    expect(summary).not.toHaveProperty("score");
  });
});
