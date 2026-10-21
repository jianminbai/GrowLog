import { z } from "zod";

import { dateInTimeZone } from "@/modules/sleep/sleep-record";

const instant = z.iso.datetime().transform((value) => new Date(value));
const optionalText = (maximum: number) => z
  .union([z.string().trim().max(maximum), z.null()])
  .transform((value) => value === "" ? null : value)
  .optional();

const activityFields = {
  activityType: z.string().trim().min(1).max(100),
  durationMinutes: z.number().int().min(1).max(24 * 60),
  outdoorMinutes: z.number().int().min(0).max(24 * 60).nullable().optional(),
  intensity: z.enum(["LIGHT", "MODERATE", "VIGOROUS"]),
  structure: z.enum(["FREE_PLAY", "STRUCTURED", "MIXED"]),
  occurredAt: instant,
  engagement: optionalText(200),
  notes: optionalText(2_000),
  source: z.enum(["MANUAL", "HOME", "HOSPITAL", "KINDERGARTEN", "IMPORT"])
};

function validateDuration(
  value: { durationMinutes?: number; outdoorMinutes?: number | null },
  context: z.RefinementCtx
) {
  if (value.durationMinutes !== undefined && (value.outdoorMinutes ?? 0) > value.durationMinutes) {
    context.addIssue({
      code: "custom",
      path: ["outdoorMinutes"],
      message: "Outdoor time cannot exceed total activity time."
    });
  }
}

export const activityCreateSchema = z.object(activityFields).strict().superRefine(validateDuration);
export const activityUpdateSchema = z.object(activityFields).partial().strict()
  .refine((value) => Object.keys(value).length > 0, { message: "Submit at least one field." });

export type ActivityCreateValues = z.output<typeof activityCreateSchema>;
export type ActivityUpdateValues = z.output<typeof activityUpdateSchema>;

function offsetDate(date: string, days: number) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

type SummaryRecord = {
  occurredAt: Date;
  durationMinutes: number;
  outdoorMinutes: number | null;
  intensity: "LIGHT" | "MODERATE" | "VIGOROUS";
};

export function summarizeActivity(records: SummaryRecord[], timeZone: string, asOfDate: string) {
  const firstDate = offsetDate(asOfDate, -6);
  const dailyTotals = new Map<string, {
    sessions: number;
    totalMinutes: number;
    outdoorMinutes: number;
    moderateVigorousMinutes: number;
  }>();

  for (const record of records) {
    const date = dateInTimeZone(record.occurredAt, timeZone);
    if (date < firstDate || date > asOfDate) continue;
    const current = dailyTotals.get(date) ?? {
      sessions: 0, totalMinutes: 0, outdoorMinutes: 0, moderateVigorousMinutes: 0
    };
    current.sessions += 1;
    current.totalMinutes += record.durationMinutes;
    current.outdoorMinutes += record.outdoorMinutes ?? 0;
    if (record.intensity === "MODERATE" || record.intensity === "VIGOROUS") {
      current.moderateVigorousMinutes += record.durationMinutes;
    }
    dailyTotals.set(date, current);
  }

  const daily = [...dailyTotals.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, totals]) => ({
      date,
      totalMinutes: totals.totalMinutes,
      outdoorMinutes: totals.outdoorMinutes,
      moderateVigorousMinutes: totals.moderateVigorousMinutes
    }));
  const last7Days = [...dailyTotals.values()].reduce((total, item) => ({
    sessions: total.sessions + item.sessions,
    totalMinutes: total.totalMinutes + item.totalMinutes,
    outdoorMinutes: total.outdoorMinutes + item.outdoorMinutes,
    moderateVigorousMinutes: total.moderateVigorousMinutes + item.moderateVigorousMinutes
  }), { sessions: 0, totalMinutes: 0, outdoorMinutes: 0, moderateVigorousMinutes: 0 });

  return { daily, last7Days };
}
