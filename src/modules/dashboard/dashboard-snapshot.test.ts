import { describe, expect, it } from "vitest";

import { buildDashboardSnapshot } from "./dashboard-snapshot";

describe("dashboard snapshot", () => {
  it("uses the household date and preserves missing values", () => {
    const snapshot = buildDashboardSnapshot({
      date: "2026-10-20",
      timeZone: "Asia/Shanghai",
      growth: [
        { measuredAt: new Date("2026-10-18T01:00:00Z"), heightCm: 101.2, weightKg: 15.8 }
      ],
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
    expect(snapshot.latestGrowth).toEqual({ date: "2026-10-18", heightCm: 101.2, weightKg: 15.8 });
    expect(snapshot.recentSleep).toEqual({ date: "2026-10-20", minutes: 450, kind: "NIGHT" });
    expect(snapshot.today).toMatchObject({
      meals: 1, milkMl: 180, waterMl: 0, unknownBeverages: 1,
      activityMinutes: 45, outdoorMinutes: 30, mood: "CALM"
    });
    expect(snapshot.notices.join(" ")).toContain("只反映已填写记录");
    expect(snapshot.notices.join(" ")).toContain("不用于诊断");
  });

  it("reports missing categories without inventing zero-valued measurements", () => {
    const snapshot = buildDashboardSnapshot({
      date: "2026-10-20", timeZone: "UTC", growth: [], sleep: [], meals: [], beverages: [],
      activities: [], emotions: []
    });

    expect(snapshot.completion).toEqual({ sleep: false, nutrition: false, activity: false, emotion: false });
    expect(snapshot.latestGrowth).toBeNull();
    expect(snapshot.recentSleep).toBeNull();
    expect(snapshot.today.milkMl).toBeNull();
    expect(snapshot.today.waterMl).toBeNull();
    expect(snapshot.today.mood).toBeNull();
    expect(snapshot.notices).toContain("近 7 天暂无睡眠记录，当前无法判断睡眠趋势。");
  });
});
