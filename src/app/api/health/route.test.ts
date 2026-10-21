import { describe, expect, it, vi } from "vitest";

import { createHealthHandler } from "./health-handler";

describe("health endpoint", () => {
  it("reports ready only after a successful database probe", async () => {
    const probe = vi.fn().mockResolvedValue(undefined);
    const response = await createHealthHandler(probe)();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ data: { status: "ok", database: "ok" } });
    expect(probe).toHaveBeenCalledOnce();
  });

  it("returns a generic unavailable response when the database probe fails", async () => {
    const response = await createHealthHandler(vi.fn().mockRejectedValue(new Error("secret connection detail")))();
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain("secret connection detail");
  });
});
