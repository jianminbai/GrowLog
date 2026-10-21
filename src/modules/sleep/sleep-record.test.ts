import { describe, expect, it } from "vitest";

import {
  calculateSleepMinutes,
  sleepCreateSchema,
  summarizeSleep
} from "./sleep-record";

describe("sleep interval rules", () => {
  it("supports overnight intervals and subtracts awake time", () => {
    const parsed = sleepCreateSchema.parse({
      kind: "NIGHT",
      startedAt: "2026-10-19T13:00:00.000Z",
      endedAt: "2026-10-19T21:00:00.000Z",
      awakeMinutes: 30,
      wakeCount: 2,
      source: "HOME",
      observation: "  slept calmly  "
    });
    expect(calculateSleepMinutes(parsed.startedAt, parsed.endedAt, parsed.awakeMinutes)).toBe(450);
    expect(parsed.observation).toBe("slept calmly");
  });

  it.each([
    ["2026-10-20T10:00:00.000Z", "2026-10-20T09:00:00.000Z", 0],
    ["2026-10-20T08:00:00.000Z", "2026-10-20T09:00:00.000Z", 61]
  ])("rejects invalid interval %s to %s", (startedAt, endedAt, awakeMinutes) => {
    expect(
      sleepCreateSchema.safeParse({
        kind: "NAP",
        startedAt,
        endedAt,
        awakeMinutes,
        source: "HOME"
      }).success
    ).toBe(false);
  });
});

describe("sleep summaries", () => {
  it("assigns sessions to the waking date in the household timezone", () => {
    const summary = summarizeSleep(
      [
        {
          kind: "NIGHT",
          startedAt: new Date("2026-10-19T13:00:00.000Z"),
          endedAt: new Date("2026-10-19T21:00:00.000Z"),
          awakeMinutes: 30
        },
        {
          kind: "NAP",
          startedAt: new Date("2026-10-20T05:00:00.000Z"),
          endedAt: new Date("2026-10-20T06:00:00.000Z"),
          awakeMinutes: null
        },
        {
          kind: "NIGHT",
          startedAt: new Date("2026-10-12T13:00:00.000Z"),
          endedAt: new Date("2026-10-12T21:00:00.000Z"),
          awakeMinutes: 0
        }
      ],
      "Asia/Shanghai",
      "2026-10-20"
    );

    expect(summary.daily).toContainEqual({
      date: "2026-10-20",
      totalMinutes: 510,
      nightMinutes: 450,
      napMinutes: 60
    });
    expect(summary.last7DaysMinutes).toBe(510);
    expect(summary.last30DaysMinutes).toBe(990);
  });
});
