import { z } from "zod";

export const kindergartenDocumentTypes = ["DAILY_CARE_SHEET", "WEEKLY_MENU"] as const;
export type KindergartenDocumentTypeValue = (typeof kindergartenDocumentTypes)[number];

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

function parseCalendarDate(value: string): Date | null {
  if (!isoDate.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? date
    : null;
}

const calendarDateSchema = z.string().refine((value) => parseCalendarDate(value) !== null, "Enter a valid date.");

export const documentUploadFieldsSchema = z.object({
  childId: z.string().trim().min(1).max(128),
  type: z.enum(kindergartenDocumentTypes),
  date: calendarDateSchema
}).strict();

export function normalizePeriodStart(type: KindergartenDocumentTypeValue, dateValue: string): string {
  const date = parseCalendarDate(dateValue);
  if (!date) throw new Error("Enter a valid date.");
  if (type === "WEEKLY_MENU") {
    const daysFromMonday = (date.getUTCDay() + 6) % 7;
    date.setUTCDate(date.getUTCDate() - daysFromMonday);
  }
  return date.toISOString().slice(0, 10);
}

export function sanitizeOriginalFileName(value: string): string {
  const cleaned = value
    .normalize("NFC")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\.\./g, "")
    .replace(/[\\/]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .trim();
  const fallback = cleaned || "image";
  if (fallback.length <= 255) return fallback;
  const extensionMatch = fallback.match(/(\.[A-Za-z0-9]{1,10})$/);
  const extension = extensionMatch?.[1] ?? "";
  return `${fallback.slice(0, 255 - extension.length)}${extension}`;
}

type SupportedImage = { mimeType: "image/jpeg" | "image/png" | "image/webp"; extension: "jpg" | "png" | "webp" };

function detectImage(bytes: Uint8Array): SupportedImage | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mimeType: "image/jpeg", extension: "jpg" };
  }
  if (
    bytes.length >= 8 &&
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value)
  ) {
    return { mimeType: "image/png", extension: "png" };
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return { mimeType: "image/webp", extension: "webp" };
  }
  return null;
}

export type ValidatedImage = SupportedImage & {
  originalFileName: string;
  sizeBytes: number;
  bytes: Uint8Array;
};

const maximumImageBytes = 10 * 1024 * 1024;

export async function validateImage(file: File): Promise<ValidatedImage> {
  if (file.size === 0) throw new Error("The image is empty.");
  if (file.size > maximumImageBytes) throw new Error("The image must be no larger than 10 MiB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = detectImage(bytes);
  if (!detected) throw new Error("Upload a JPEG, PNG, or WebP image.");
  if (file.type !== detected.mimeType) throw new Error("The image content does not match its MIME type.");
  const originalFileName = sanitizeOriginalFileName(file.name) || `image.${detected.extension}`;
  return { ...detected, originalFileName, sizeBytes: bytes.byteLength, bytes };
}
