import { dateInTimeZone } from "@/modules/sleep/sleep-record";
export type SeriesPoint = { at: string; value: number | null };
/** Missing amounts make that day's total unknown; no rows are invented for absent days. */
export function dailyTotals(points: SeriesPoint[], timeZone: string): SeriesPoint[] {
  const totals = new Map<string, number | null>();
  for (const point of points) {
    const day = dateInTimeZone(new Date(point.at), timeZone);
    const previous = totals.get(day);
    totals.set(day, point.value === null || previous === null ? null : (previous ?? 0) + point.value);
  }
  return [...totals.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([at, value]) => ({ at, value }));
}
