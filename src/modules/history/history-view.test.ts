import { describe, expect, it } from "vitest";

import type { HistoryEntry } from "./history-repository";
import { groupHistoryEntries } from "./history-view";

function entry(occurredAt: string): HistoryEntry {
  return {
    id: occurredAt,
    kind: "GROWTH",
    childId: "child-1",
    childName: "小满",
    occurredAt: new Date(occurredAt),
    title: "身高体重",
    detail: "104 cm · 17 kg",
    href: "/children/child-1/growth",
    deletedAt: null
  };
}

describe("groupHistoryEntries", () => {
  it("includes the year in older date headings", () => {
    const [group] = groupHistoryEntries(
      [entry("2025-10-20T02:00:00.000Z")],
      "Asia/Shanghai",
      new Date("2026-10-22T04:00:00.000Z")
    );

    expect(group?.label).toMatch(/2025年10月20日/);
  });
});
