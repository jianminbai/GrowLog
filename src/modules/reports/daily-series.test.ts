import { describe, expect, it } from "vitest";
import { dailyTotals } from "./daily-series";
describe("daily recorded totals", () => {
  it("groups by household date and does not turn unknown totals into zero or partial totals", () => {
    expect(dailyTotals([
      { at: "2026-10-01T16:30:00Z", value: 20 },
      { at: "2026-10-02T01:00:00Z", value: 30 },
      { at: "2026-10-02T16:00:00Z", value: null },
      { at: "2026-10-03T01:00:00Z", value: 10 },
      { at: "2026-10-04T01:00:00Z", value: 0 }
    ], "Asia/Shanghai")).toEqual([
      { at: "2026-10-02", value: 50 },
      { at: "2026-10-03", value: null },
      { at: "2026-10-04", value: 0 }
    ]);
  });
});
