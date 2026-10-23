import type { PrismaClient } from "@prisma/client";

import { calculateSleepMinutes } from "@/modules/sleep/sleep-record";

export type HistoryEntry = {
  id: string;
  kind: "GROWTH" | "SLEEP" | "MEAL" | "BEVERAGE" | "ACTIVITY" | "EMOTION";
  childId: string;
  childName: string;
  occurredAt: Date;
  title: string;
  detail: string;
  href: string;
  deletedAt: Date | null;
};

const number = (value: { toString(): string } | null) => value === null ? null : Number(value.toString());
const filter = (householdId: string, includeDeleted: boolean) => ({
  householdId,
  ...(includeDeleted ? {} : { deletedAt: null })
});

export async function listHistoryEntries(
  client: PrismaClient,
  householdId: string,
  includeDeleted = false
): Promise<HistoryEntry[]> {
  const [growth, sleep, meals, beverages, activities, emotions] = await Promise.all([
    client.growthMeasurement.findMany({
      where: filter(householdId, includeDeleted), include: { child: { select: { name: true } } }
    }),
    client.sleepSession.findMany({
      where: filter(householdId, includeDeleted), include: { child: { select: { name: true } } }
    }),
    client.meal.findMany({
      where: filter(householdId, includeDeleted), include: {
        child: { select: { name: true } }, items: { where: { deletedAt: null }, select: { id: true } }
      }
    }),
    client.beverageIntake.findMany({
      where: filter(householdId, includeDeleted), include: { child: { select: { name: true } } }
    }),
    client.physicalActivity.findMany({
      where: filter(householdId, includeDeleted), include: { child: { select: { name: true } } }
    }),
    client.emotionRecord.findMany({
      where: filter(householdId, includeDeleted), include: { child: { select: { name: true } } }
    })
  ]);

  const entries: HistoryEntry[] = [
    ...growth.map((record) => ({
      id: record.id, kind: "GROWTH" as const, childId: record.childId, childName: record.child.name,
      occurredAt: record.measuredAt, title: "身高体重",
      detail: [number(record.heightCm) === null ? null : `${number(record.heightCm)} cm`, number(record.weightKg) === null ? null : `${number(record.weightKg)} kg`].filter(Boolean).join(" · ") || "测量值未填写",
      href: `/settings/children/${record.childId}/records/growth`, deletedAt: record.deletedAt
    })),
    ...sleep.map((record) => ({
      id: record.id, kind: "SLEEP" as const, childId: record.childId, childName: record.child.name,
      occurredAt: record.endedAt, title: record.kind === "NIGHT" ? "夜间睡眠" : "小睡",
      detail: `${calculateSleepMinutes(record.startedAt, record.endedAt, record.awakeMinutes)} 分钟`,
      href: `/settings/children/${record.childId}/records/sleep`, deletedAt: record.deletedAt
    })),
    ...meals.map((record) => ({
      id: record.id, kind: "MEAL" as const, childId: record.childId, childName: record.child.name,
      occurredAt: record.occurredAt, title: "饮食记录", detail: `${record.items.length} 项食物`,
      href: `/settings/children/${record.childId}/records/nutrition`, deletedAt: record.deletedAt
    })),
    ...beverages.map((record) => ({
      id: record.id, kind: "BEVERAGE" as const, childId: record.childId, childName: record.child.name,
      occurredAt: record.occurredAt, title: record.type === "MILK" ? "奶量" : record.type === "WATER" ? "饮水" : "饮品",
      detail: record.volumeMl === null ? "容量未记录" : `${record.volumeMl} ml`,
      href: `/settings/children/${record.childId}/records/nutrition`, deletedAt: record.deletedAt
    })),
    ...activities.map((record) => ({
      id: record.id, kind: "ACTIVITY" as const, childId: record.childId, childName: record.child.name,
      occurredAt: record.occurredAt, title: record.activityType,
      detail: `${record.durationMinutes} 分钟 · ${record.outdoorMinutes === null ? "户外未记录" : `户外 ${record.outdoorMinutes} 分钟`}`,
      href: `/settings/children/${record.childId}/records/activity`, deletedAt: record.deletedAt
    })),
    ...emotions.map((record) => ({
      id: record.id, kind: "EMOTION" as const, childId: record.childId, childName: record.child.name,
      occurredAt: record.occurredAt, title: "情绪观察", detail: record.tags.join(" · ") || record.mood,
      href: `/settings/children/${record.childId}/records/emotion`, deletedAt: record.deletedAt
    }))
  ];
  return entries.sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime());
}

function changedFields(metadata: unknown): string[] {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return [];
  const value = (metadata as { changedFields?: unknown }).changedFields;
  return Array.isArray(value) ? value.filter((field): field is string => typeof field === "string") : [];
}

export async function listAuditEvents(client: PrismaClient, householdId: string, take = 100) {
  const records = await client.auditLog.findMany({
    where: { householdId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: Math.min(Math.max(take, 1), 500)
  });
  return records.map((record) => ({
    id: record.id,
    actorId: record.actorId,
    action: record.action,
    entityType: record.entityType,
    entityId: record.entityId,
    changedFields: changedFields(record.metadata),
    createdAt: record.createdAt
  }));
}
