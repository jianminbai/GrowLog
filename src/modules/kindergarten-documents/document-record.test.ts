import { describe, expect, it } from "vitest";

import {
  documentUploadFieldsSchema,
  normalizePeriodStart,
  sanitizeOriginalFileName,
  validateImage
} from "./document-record";

const file = (bytes: number[], name: string, type: string) =>
  new File([Uint8Array.from(bytes)], name, { type });

describe("kindergarten document fields", () => {
  it("accepts only real calendar dates", () => {
    expect(documentUploadFieldsSchema.safeParse({
      childId: "child-1",
      type: "DAILY_CARE_SHEET",
      date: "2024-02-29"
    }).success).toBe(true);
    expect(documentUploadFieldsSchema.safeParse({
      childId: "child-1",
      type: "DAILY_CARE_SHEET",
      date: "2025-02-29"
    }).success).toBe(false);
    expect(documentUploadFieldsSchema.safeParse({
      childId: "child-1",
      type: "DAILY_CARE_SHEET",
      date: "2026-04-31"
    }).success).toBe(false);
  });

  it.each([
    ["DAILY_CARE_SHEET", "2026-01-04", "2026-01-04"],
    ["WEEKLY_MENU", "2026-01-04", "2025-12-29"],
    ["WEEKLY_MENU", "2026-01-05", "2026-01-05"],
    ["WEEKLY_MENU", "2024-01-01", "2024-01-01"]
  ] as const)("normalizes %s on %s to %s", (type, date, expected) => {
    expect(normalizePeriodStart(type, date)).toBe(expected);
  });

  it("rejects an impossible date before normalization", () => {
    expect(() => normalizePeriodStart("WEEKLY_MENU", "2026-02-30")).toThrow("valid date");
  });
});

describe("kindergarten document image validation", () => {
  it("removes path/control characters and caps the stored display name", () => {
    expect(sanitizeOriginalFileName("../班级\u0000/保教单.png")).toBe("班级-保教单.png");
    const result = sanitizeOriginalFileName(`${"长".repeat(300)}.png`);
    expect(result.length).toBeLessThanOrEqual(255);
    expect(result.endsWith(".png")).toBe(true);
  });

  it.each([
    [[0xff, 0xd8, 0xff, 0xe0], "photo.jpg", "image/jpeg", "jpg", "image/jpeg"],
    [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], "photo.png", "image/png", "png", "image/png"],
    [[0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50], "photo.webp", "image/webp", "webp", "image/webp"]
  ] as const)("accepts a real %s image", async (bytes, name, type, extension, mimeType) => {
    const result = await validateImage(file([...bytes], name, type));
    expect(result).toMatchObject({ extension, mimeType, originalFileName: name, sizeBytes: bytes.length });
    expect([...result.bytes]).toEqual([...bytes]);
  });

  it("rejects empty images and MIME/signature disagreements", async () => {
    await expect(validateImage(file([], "empty.png", "image/png"))).rejects.toThrow("empty");
    await expect(validateImage(file([0xff, 0xd8, 0xff], "fake.png", "image/png"))).rejects.toThrow("match");
    await expect(validateImage(file([1, 2, 3, 4], "text.png", "image/png"))).rejects.toThrow("JPEG, PNG, or WebP");
  });

  it("rejects images larger than 10 MiB before accepting their bytes", async () => {
    const tooLarge = new File([new Uint8Array(10 * 1024 * 1024 + 1)], "large.png", { type: "image/png" });
    await expect(validateImage(tooLarge)).rejects.toThrow("10 MiB");
  });
});
