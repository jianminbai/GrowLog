import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const route = (domain: string) => readFileSync(
  new URL(`./(protected)/children/[childId]/${domain}/page.tsx`, import.meta.url),
  "utf8"
);

describe("deleted-record placement", () => {
  it("keeps deleted data out of everyday domain pages", () => {
    for (const domain of ["growth", "sleep", "nutrition", "activity", "emotion"]) {
      const source = route(domain);
      expect(source, domain).not.toContain(", true)");
      expect(source, domain).not.toContain("已删除记录");
    }
  });

  it("loads deleted data only from the low-frequency management page", () => {
    const source = readFileSync(
      new URL("./(protected)/settings/data-management/page.tsx", import.meta.url),
      "utf8"
    );
    expect(source).toContain("listHistoryEntries(prisma, auth.householdId, true)");
  });
});
