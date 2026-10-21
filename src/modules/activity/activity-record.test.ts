import { describe, expect, it } from "vitest";

import { activityCreateSchema, summarizeActivity } from "./activity-record";

describe("activity record rules", () => {
  it("normalizes a complete activity entry", () => {
    const parsed = activityCreateSchema.parse({
      activityType: "  骑车  ",
      durationMinutes: 60,
      outdoorMinutes: 45,
      intensity: "MODERATE",
      structure: "FREE_PLAY",
      occurredAt: "2026-10-20T08:00:00.000Z",
      engagement: "  主动参与  ",
      notes: "  和家人一起  ",
      source: "HOME"
    });

    expect(parsed).toMatchObject({
      activityType: "骑车",
      outdoorMinutes: 45,
      engagement: "主动参与",
      notes: "和家人一起"
    });
    expect(parsed.occurredAt).toEqual(new Date("2026-10-20T08:00:00.000Z"));
  });

  it.each([
    [{ durationMinutes: 0, outdoorMinutes: 0 }],
    [{ durationMinutes: 30, outdoorMinutes: 31 }],
    [{ durationMinutes: 30, outdoorMinutes: -1 }]
  ])("rejects invalid durations: %o", (duration) => {
    expect(activityCreateSchema.safeParse({
      activityType: "跑步",
      intensity: "LIGHT",
      structure: "STRUCTURED",
      occurredAt: "2026-10-20T08:00:00.000Z",
      source: "KINDERGARTEN",
      ...duration
    }).success).toBe(false);
  });
});

describe("activity weekly summary", () => {
  it("groups by household date and keeps outdoor time separate from moderate/vigorous minutes", () => {
    const summary = summarizeActivity([
      {
        occurredAt: new Date("2026-10-19T16:30:00.000Z"),
        durationMinutes: 60,
        outdoorMinutes: 50,
        intensity: "LIGHT"
      },
      {
        occurredAt: new Date("2026-10-20T03:00:00.000Z"),
        durationMinutes: 20,
        outdoorMinutes: 0,
        intensity: "VIGOROUS"
      },
      {
        occurredAt: new Date("2026-10-13T03:00:00.000Z"),
        durationMinutes: 30,
        outdoorMinutes: 30,
        intensity: "MODERATE"
      }
    ], "Asia/Shanghai", "2026-10-20");

    expect(summary.daily).toEqual([
      { date: "2026-10-20", totalMinutes: 80, outdoorMinutes: 50, moderateVigorousMinutes: 20 }
    ]);
    expect(summary.last7Days).toEqual({
      sessions: 2,
      totalMinutes: 80,
      outdoorMinutes: 50,
      moderateVigorousMinutes: 20
    });
  });
});
