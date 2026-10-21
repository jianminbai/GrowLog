import { z } from "zod";

import { dateInTimeZone } from "@/modules/sleep/sleep-record";

const moods = ["HAPPY", "CALM", "ANXIOUS", "SAD", "ANGRY", "MIXED", "OTHER"] as const;
const instant = z.iso.datetime().transform((value) => new Date(value));
const optionalText = (maximum: number) => z
  .union([z.string().trim().max(maximum), z.null()])
  .transform((value) => value === "" ? null : value)
  .optional();
const tags = z.array(z.string().trim().min(1).max(40)).max(12)
  .transform((values) => [...new Set(values)]);

const emotionFields = {
  mood: z.enum(moods),
  tags,
  context: optionalText(500),
  durationMinutes: z.number().int().min(1).max(24 * 60).nullable().optional(),
  peerInteraction: optionalText(500),
  parentInteraction: optionalText(500),
  notes: optionalText(2_000),
  occurredAt: instant,
  source: z.enum(["MANUAL", "HOME", "HOSPITAL", "KINDERGARTEN", "IMPORT"])
};

export const emotionCreateSchema = z.object({ ...emotionFields, tags: tags.default([]) }).strict();
export const emotionUpdateSchema = z.object(emotionFields).partial().strict()
  .refine((value) => Object.keys(value).length > 0, { message: "Submit at least one field." });

export type EmotionCreateValues = z.output<typeof emotionCreateSchema>;
export type EmotionUpdateValues = z.output<typeof emotionUpdateSchema>;

type Mood = typeof moods[number];
type SummaryRecord = { mood: Mood; tags: string[]; occurredAt: Date };
type Counts = { total: number; byMood: Partial<Record<Mood, number>>; byTag: Record<string, number> };

function offsetDate(date: string, days: number) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function emptyCounts(): Counts {
  return { total: 0, byMood: {}, byTag: {} };
}

function add(counts: Counts, record: SummaryRecord) {
  counts.total += 1;
  counts.byMood[record.mood] = (counts.byMood[record.mood] ?? 0) + 1;
  for (const tag of record.tags) counts.byTag[tag] = (counts.byTag[tag] ?? 0) + 1;
}

export function summarizeEmotions(records: SummaryRecord[], timeZone: string, asOfDate: string) {
  const start7 = offsetDate(asOfDate, -6);
  const start30 = offsetDate(asOfDate, -29);
  const last7Days = emptyCounts();
  const last30Days = emptyCounts();
  const dailyCounts = new Map<string, Counts>();

  for (const record of records) {
    const date = dateInTimeZone(record.occurredAt, timeZone);
    if (date < start30 || date > asOfDate) continue;
    add(last30Days, record);
    if (date < start7) continue;
    add(last7Days, record);
    const daily = dailyCounts.get(date) ?? emptyCounts();
    add(daily, record);
    dailyCounts.set(date, daily);
  }

  const daily = [...dailyCounts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, counts]) => ({ date, total: counts.total, byMood: counts.byMood }));
  return { daily, last7Days, last30Days };
}
