import { describe, expect, it } from "vitest";

import { buildDashboardSnapshot } from "./dashboard-snapshot";

describe("dashboard snapshot", () => {
  it("uses the household date and preserves missing values", () => {
    const snapshot = buildDashboardSnapshot({
      date: "2026-10-20",
      timeZone: "Asia/Shanghai",
      sleep: [
        { kind: "NIGHT", startedAt: new Date("2026-10-19T13:00:00Z"), endedAt: new Date("2026-10-19T21:00:00Z"), awakeMinutes: 30 }
      ],
      meals: [{ occurredAt: new Date("2026-10-19T16:30:00Z"), items: [{ deletedAt: null }] }],
      beverages: [
        { occurredAt: new Date("2026-10-20T01:00:00Z"), type: "MILK", volumeMl: 180 },
        { occurredAt: new Date("2026-10-20T02:00:00Z"), type: "WATER", volumeMl: null }
      ],
      activities: [
        { occurredAt: new Date("2026-10-20T03:00:00Z"), durationMinutes: 45, outdoorMinutes: 30, intensity: "LIGHT" }
      ],
      emotions: [
        { occurredAt: new Date("2026-10-20T04:00:00Z"), mood: "CALM", tags: ["入园"] }
      ]
    });

    expect(snapshot.completion).toEqual({ sleep: true, nutrition: true, activity: true, emotion: true });
    expect(snapshot).not.toHaveProperty("latestGrowth");
    expect(snapshot).not.toHaveProperty("recentSleep");
    expect(snapshot).not.toHaveProperty("notices");
    expect(snapshot.today).toMatchObject({
      sleepMinutes: 450, meals: 1, milkMl: 180, waterMl: null, unknownBeverages: 1,
      activityMinutes: 45, outdoorMinutes: 30, unknownOutdoorActivities: 0, mood: "CALM"
    });
  });

  it("reports missing categories without inventing zero-valued measurements", () => {
    const snapshot = buildDashboardSnapshot({
      date: "2026-10-20", timeZone: "UTC", sleep: [], meals: [], beverages: [],
      activities: [], emotions: []
    });

    expect(snapshot.completion).toEqual({ sleep: false, nutrition: false, activity: false, emotion: false });
    expect(snapshot).not.toHaveProperty("latestGrowth");
    expect(snapshot).not.toHaveProperty("recentSleep");
    expect(snapshot.today.milkMl).toBeNull();
    expect(snapshot.today.waterMl).toBeNull();
    expect(snapshot.today.sleepMinutes).toBeNull();
    expect(snapshot.today.outdoorMinutes).toBeNull();
    expect(snapshot.today.unknownOutdoorActivities).toBe(0);
    expect(snapshot.today.mood).toBeNull();
    expect(snapshot).not.toHaveProperty("notices");
  });

  it("keeps drink types unknown when a meal or a different drink type was recorded", () => {
    const snapshot = buildDashboardSnapshot({
      date: "2026-10-20", timeZone: "UTC", sleep: [],
      meals: [{ occurredAt: new Date("2026-10-20T08:00:00Z"), items: [] }],
      beverages: [{ occurredAt: new Date("2026-10-20T09:00:00Z"), type: "MILK", volumeMl: 120 }],
      activities: [], emotions: []
    });

    expect(snapshot.today.milkMl).toBe(120);
    expect(snapshot.today.waterMl).toBeNull();
  });

  it("marks outdoor totals as unknown or partial when activities omit outdoor duration", () => {
    const noKnownOutdoor = buildDashboardSnapshot({
      date: "2026-10-20", timeZone: "UTC", sleep: [], meals: [], beverages: [],
      activities: [{ occurredAt: new Date("2026-10-20T08:00:00Z"), durationMinutes: 30, outdoorMinutes: null, intensity: "LIGHT" }],
      emotions: []
    });
    const partialOutdoor = buildDashboardSnapshot({
      date: "2026-10-20", timeZone: "UTC", sleep: [], meals: [], beverages: [],
      activities: [
        { occurredAt: new Date("2026-10-20T08:00:00Z"), durationMinutes: 30, outdoorMinutes: 10, intensity: "LIGHT" },
        { occurredAt: new Date("2026-10-20T09:00:00Z"), durationMinutes: 20, outdoorMinutes: null, intensity: "MODERATE" }
      ],
      emotions: []
    });

    expect(noKnownOutdoor.today.outdoorMinutes).toBeNull();
    expect(noKnownOutdoor.today.unknownOutdoorActivities).toBe(1);
    expect(partialOutdoor.today.outdoorMinutes).toBe(10);
    expect(partialOutdoor.today.unknownOutdoorActivities).toBe(1);
  });
});
