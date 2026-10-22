import { describe, expect, it } from "vitest";

import {
  calculateBmi,
  calculateAnnualizedHeightGrowth,
  calculateGrowthChanges,
  growthCreateSchema,
  growthUpdateSchema
} from "./growth-record";

describe("growth record validation", () => {
  it("normalizes a complete record with explicit metadata", () => {
    expect(
      growthCreateSchema.parse({
        measuredAt: "2026-10-20T08:30:00.000Z",
        heightCm: 110.4,
        weightKg: 18.25,
        headCircumferenceCm: null,
        source: "HOME",
        place: "  家中  ",
        method: "站立测量",
        device: "身高尺",
        precisionNote: "约 0.1 cm",
        notes: "  早餐前  "
      })
    ).toEqual({
      measuredAt: new Date("2026-10-20T08:30:00.000Z"),
      heightCm: 110.4,
      weightKg: 18.25,
      headCircumferenceCm: null,
      source: "HOME",
      place: "家中",
      method: "站立测量",
      device: "身高尺",
      precisionNote: "约 0.1 cm",
      notes: "早餐前"
    });
  });

  it.each([
    [{ measuredAt: "invalid", heightCm: 110, source: "HOME" }, "measuredAt"],
    [{ measuredAt: "2026-10-20T08:30:00.000Z", source: "HOME" }, "heightCm"],
    [{ measuredAt: "2026-10-20T08:30:00.000Z", heightCm: 0, source: "HOME" }, "heightCm"],
    [{ measuredAt: "2026-10-20T08:30:00.000Z", weightKg: 301, source: "HOME" }, "weightKg"]
  ])("rejects invalid growth data for %s", (input, field) => {
    const result = growthCreateSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === field)).toBe(true);
    }
  });

  it("requires an update field", () => {
    expect(growthUpdateSchema.safeParse({}).success).toBe(false);
    expect(growthUpdateSchema.parse({ notes: "  corrected  " })).toEqual({ notes: "corrected" });
  });
});

describe("growth calculations", () => {
  it("computes BMI only when both height and weight are available", () => {
    expect(calculateBmi(110.4, 18.25)).toBe(14.97);
    expect(calculateBmi(110.4, null)).toBeNull();
    expect(calculateBmi(null, 18.25)).toBeNull();
  });

  it("compares each value with the previous available measurement", () => {
    expect(
      calculateGrowthChanges([
        { heightCm: 100, weightKg: 15 },
        { heightCm: null, weightKg: 15.5 },
        { heightCm: 102.3, weightKg: null }
      ])
    ).toEqual([
      { heightChangeCm: null, weightChangeKg: null },
      { heightChangeCm: null, weightChangeKg: 0.5 },
      { heightChangeCm: 2.3, weightChangeKg: null }
    ]);
  });

  it("annualizes height change using the real interval and the previous available height", () => {
    expect(calculateAnnualizedHeightGrowth([
      { measuredAt: new Date("2025-01-01T00:00:00Z"), heightCm: 100 },
      { measuredAt: new Date("2025-06-01T00:00:00Z"), heightCm: null },
      { measuredAt: new Date("2026-01-01T00:00:00Z"), heightCm: 104 }
    ])).toEqual([null, null, 4]);
  });

  it("keeps annualized growth unknown when there is no positive time interval", () => {
    expect(calculateAnnualizedHeightGrowth([
      { measuredAt: new Date("2026-01-01T00:00:00Z"), heightCm: 100 },
      { measuredAt: new Date("2026-01-31T00:00:00Z"), heightCm: 101 },
      { measuredAt: new Date("2026-01-31T00:00:00Z"), heightCm: 102 }
    ])).toEqual([null, 12.17, null]);
  });
});
