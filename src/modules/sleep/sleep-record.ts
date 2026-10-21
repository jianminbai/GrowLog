import { z } from "zod";

const instant = z.iso.datetime().transform((value) => new Date(value));
const optionalText = z
  .union([z.string().trim().max(2_000), z.null()])
  .transform((value) => (value === "" ? null : value))
  .optional();

const fields = {
  kind: z.enum(["NIGHT", "NAP"]),
  startedAt: instant,
  endedAt: instant,
  awakeMinutes: z.number().int().min(0).nullable().optional(),
  wakeCount: z.number().int().min(0).max(100).nullable().optional(),
  observation: optionalText,
  source: z.enum(["MANUAL", "HOME", "HOSPITAL", "KINDERGARTEN", "IMPORT"])
};

function validateInterval(
  value: { startedAt: Date; endedAt: Date; awakeMinutes?: number | null },
  context: z.RefinementCtx
) {
  const elapsedMinutes = (value.endedAt.getTime() - value.startedAt.getTime()) / 60_000;
  if (elapsedMinutes <= 0 || elapsedMinutes > 36 * 60) {
    context.addIssue({ code: "custom", path: ["endedAt"], message: "End must follow start within 36 hours." });
  }
  if ((value.awakeMinutes ?? 0) > elapsedMinutes) {
    context.addIssue({ code: "custom", path: ["awakeMinutes"], message: "Awake time cannot exceed the interval." });
  }
}

export const sleepCreateSchema = z.object(fields).strict().superRefine(validateInterval);
export const sleepUpdateSchema = z
  .object(fields)
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: "Submit at least one field." });

export type SleepCreateValues = z.output<typeof sleepCreateSchema>;
export type SleepUpdateValues = z.output<typeof sleepUpdateSchema>;

export function calculateSleepMinutes(startedAt: Date, endedAt: Date, awakeMinutes: number | null | undefined) {
  return Math.round((endedAt.getTime() - startedAt.getTime()) / 60_000) - (awakeMinutes ?? 0);
}

export function dateInTimeZone(instantValue: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(instantValue);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function offsetDate(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function summarizeSleep(
  records: Array<{
    kind: "NIGHT" | "NAP";
    startedAt: Date;
    endedAt: Date;
    awakeMinutes: number | null;
  }>,
  timeZone: string,
  asOfDate: string
) {
  const start30 = offsetDate(asOfDate, -29);
  const start7 = offsetDate(asOfDate, -6);
  const totals = new Map<string, { totalMinutes: number; nightMinutes: number; napMinutes: number }>();

  for (const record of records) {
    const date = dateInTimeZone(record.endedAt, timeZone);
    if (date < start30 || date > asOfDate) continue;
    const minutes = calculateSleepMinutes(record.startedAt, record.endedAt, record.awakeMinutes);
    const total = totals.get(date) ?? { totalMinutes: 0, nightMinutes: 0, napMinutes: 0 };
    total.totalMinutes += minutes;
    if (record.kind === "NIGHT") total.nightMinutes += minutes;
    else total.napMinutes += minutes;
    totals.set(date, total);
  }

  const daily = [...totals.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, total]) => ({ date, ...total }));
  return {
    daily,
    last7DaysMinutes: daily
      .filter((item) => item.date >= start7)
      .reduce((sum, item) => sum + item.totalMinutes, 0),
    last30DaysMinutes: daily.reduce((sum, item) => sum + item.totalMinutes, 0)
  };
}
