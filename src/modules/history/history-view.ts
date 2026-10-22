import type { HistoryEntry } from "./history-repository";

function dateKey(value: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(value);
  const valueOf = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${valueOf("year")}-${valueOf("month")}-${valueOf("day")}`;
}

function previousDateKey(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year!, month! - 1, day! - 1)).toISOString().slice(0, 10);
}

function dateLabel(value: Date, key: string, today: string, timeZone: string): string {
  if (key === today) return "今天";
  if (key === previousDateKey(today)) return "昨天";
  return value.toLocaleDateString("zh-CN", { timeZone, month: "long", day: "numeric", weekday: "short" });
}

export function groupHistoryEntries(entries: HistoryEntry[], timeZone: string, now = new Date()) {
  const today = dateKey(now, timeZone);
  const groups = new Map<string, { dateKey: string; label: string; entries: HistoryEntry[] }>();
  for (const entry of entries) {
    const key = dateKey(entry.occurredAt, timeZone);
    const existing = groups.get(key);
    if (existing) {
      existing.entries.push(entry);
    } else {
      groups.set(key, {
        dateKey: key,
        label: dateLabel(entry.occurredAt, key, today, timeZone),
        entries: [entry]
      });
    }
  }
  return [...groups.values()];
}
