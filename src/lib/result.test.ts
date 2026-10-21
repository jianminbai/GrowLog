import { describe, expect, it } from "vitest";

import { ok, problem } from "./result";

describe("API result envelopes", () => {
  it("wraps successful data without changing it", () => {
    expect(ok({ ready: true })).toEqual({ data: { ready: true } });
  });

  it("creates a typed validation problem with field details", () => {
    expect(
      problem("VALIDATION_ERROR", "Please check the submitted fields.", 400, {
        name: ["Name is required."]
      })
    ).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Please check the submitted fields.",
        fields: { name: ["Name is required."] }
      },
      status: 400
    });
  });
});
