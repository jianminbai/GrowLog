import { describe, expect, it } from "vitest";

import { childCreateSchema, childUpdateSchema } from "./child-profile";

describe("child profile validation", () => {
  it("normalizes a complete valid profile", () => {
    const result = childCreateSchema.parse({
      name: "  小满  ",
      birthDate: "2022-05-12",
      sex: "FEMALE",
      birthHeightCm: 49.5,
      birthWeightKg: 3.26,
      motherHeightCm: 165,
      fatherHeightCm: 178.5,
      notes: "  足月出生  "
    });

    expect(result).toEqual({
      name: "小满",
      birthDate: new Date("2022-05-12T00:00:00.000Z"),
      sex: "FEMALE",
      birthHeightCm: 49.5,
      birthWeightKg: 3.26,
      motherHeightCm: 165,
      fatherHeightCm: 178.5,
      notes: "足月出生"
    });
  });

  it.each([
    [{ name: "", birthDate: "2022-05-12", sex: "FEMALE" }, "name"],
    [{ name: "小满", birthDate: "2022-02-29", sex: "FEMALE" }, "birthDate"],
    [{ name: "小满", birthDate: "2999-01-01", sex: "FEMALE" }, "birthDate"],
    [
      { name: "小满", birthDate: "2022-05-12", sex: "FEMALE", birthWeightKg: 0 },
      "birthWeightKg"
    ],
    [
      { name: "小满", birthDate: "2022-05-12", sex: "FEMALE", fatherHeightCm: 251 },
      "fatherHeightCm"
    ]
  ])("rejects invalid profile data for %s", (input, field) => {
    const result = childCreateSchema.safeParse(input);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.some((issue) => issue.path[0] === field)).toBe(true);
  });

  it("requires at least one editable field and normalizes nullable values", () => {
    expect(childUpdateSchema.safeParse({}).success).toBe(false);
    expect(
      childUpdateSchema.parse({ name: " 新名字 ", notes: null, birthHeightCm: null })
    ).toEqual({ name: "新名字", notes: null, birthHeightCm: null });
  });
});
