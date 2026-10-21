import type { PrismaClient } from "@prisma/client";

export const exportDomains = ["children", "growth", "sleep", "meals", "beverages", "activity", "emotion", "audit"] as const;
export type ExportDomain = typeof exportDomains[number];

const iso = (value: Date | null) => value?.toISOString() ?? null;
const decimal = (value: { toString(): string } | null) => value === null ? null : Number(value.toString());
const active = (householdId: string, includeDeleted: boolean) => ({
  householdId, ...(includeDeleted ? {} : { deletedAt: null })
});
function auditFields(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return [];
  const fields = (metadata as { changedFields?: unknown }).changedFields;
  return Array.isArray(fields) ? fields.filter((value): value is string => typeof value === "string") : [];
}

export async function buildHouseholdExport(
  client: PrismaClient,
  householdId: string,
  includeDeleted = false,
  now = new Date()
) {
  const [household, children, growth, sleep, meals, beverages, activities, emotions, audits] = await Promise.all([
    client.household.findUnique({ where: { id: householdId } }),
    client.child.findMany({ where: active(householdId, includeDeleted), orderBy: { createdAt: "asc" } }),
    client.growthMeasurement.findMany({ where: active(householdId, includeDeleted), orderBy: { measuredAt: "asc" } }),
    client.sleepSession.findMany({ where: active(householdId, includeDeleted), orderBy: { endedAt: "asc" } }),
    client.meal.findMany({
      where: active(householdId, includeDeleted),
      include: { items: { where: includeDeleted ? {} : { deletedAt: null }, orderBy: { createdAt: "asc" } } },
      orderBy: { occurredAt: "asc" }
    }),
    client.beverageIntake.findMany({ where: active(householdId, includeDeleted), orderBy: { occurredAt: "asc" } }),
    client.physicalActivity.findMany({ where: active(householdId, includeDeleted), orderBy: { occurredAt: "asc" } }),
    client.emotionRecord.findMany({ where: active(householdId, includeDeleted), orderBy: { occurredAt: "asc" } }),
    client.auditLog.findMany({ where: { householdId }, orderBy: { createdAt: "asc" } })
  ]);
  if (!household) throw new Error("Household not found.");
  const childNames = new Map(children.map((child) => [child.id, child.name]));

  return {
    exportVersion: 1 as const,
    exportedAt: now.toISOString(),
    includesDeleted: includeDeleted,
    household: {
      id: household.id, name: household.name, timeZone: household.timeZone,
      createdAt: household.createdAt.toISOString(), updatedAt: household.updatedAt.toISOString()
    },
    children: children.map((child) => ({
      id: child.id, name: child.name, birthDate: child.birthDate.toISOString().slice(0, 10), sex: child.sex,
      birthHeightCm: decimal(child.birthHeightCm), birthWeightKg: decimal(child.birthWeightKg),
      motherHeightCm: decimal(child.motherHeightCm), fatherHeightCm: decimal(child.fatherHeightCm),
      notes: child.notes, createdAt: child.createdAt.toISOString(), updatedAt: child.updatedAt.toISOString(),
      deletedAt: iso(child.deletedAt)
    })),
    growth: growth.map((record) => ({
      id: record.id, childId: record.childId, childName: childNames.get(record.childId) ?? "",
      measuredAt: record.measuredAt.toISOString(), heightCm: decimal(record.heightCm),
      weightKg: decimal(record.weightKg), headCircumferenceCm: decimal(record.headCircumferenceCm),
      source: record.source, place: record.place, method: record.method, device: record.device,
      precisionNote: record.precisionNote, notes: record.notes, createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(), deletedAt: iso(record.deletedAt)
    })),
    sleep: sleep.map((record) => ({
      id: record.id, childId: record.childId, childName: childNames.get(record.childId) ?? "", kind: record.kind,
      startedAt: record.startedAt.toISOString(), endedAt: record.endedAt.toISOString(),
      awakeMinutes: record.awakeMinutes, wakeCount: record.wakeCount, observation: record.observation,
      source: record.source, createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString(),
      deletedAt: iso(record.deletedAt)
    })),
    meals: meals.map((record) => ({
      id: record.id, childId: record.childId, childName: childNames.get(record.childId) ?? "", type: record.type,
      occurredAt: record.occurredAt.toISOString(), appetite: record.appetite, notes: record.notes, source: record.source,
      createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString(), deletedAt: iso(record.deletedAt),
      items: record.items.map((item) => ({
        id: item.id, name: item.name, category: item.category,
        offeredAmount: decimal(item.offeredAmount), consumedAmount: decimal(item.consumedAmount),
        estimatedAmount: decimal(item.estimatedAmount), amountUnit: item.amountUnit,
        isNewFood: item.isNewFood, reactionNote: item.reactionNote, deletedAt: iso(item.deletedAt)
      }))
    })),
    beverages: beverages.map((record) => ({
      id: record.id, childId: record.childId, childName: childNames.get(record.childId) ?? "", type: record.type,
      volumeMl: record.volumeMl, occurredAt: record.occurredAt.toISOString(), notes: record.notes,
      source: record.source, createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString(),
      deletedAt: iso(record.deletedAt)
    })),
    activity: activities.map((record) => ({
      id: record.id, childId: record.childId, childName: childNames.get(record.childId) ?? "",
      activityType: record.activityType, durationMinutes: record.durationMinutes,
      outdoorMinutes: record.outdoorMinutes, intensity: record.intensity, structure: record.structure,
      occurredAt: record.occurredAt.toISOString(), engagement: record.engagement, notes: record.notes,
      source: record.source, createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString(),
      deletedAt: iso(record.deletedAt)
    })),
    emotion: emotions.map((record) => ({
      id: record.id, childId: record.childId, childName: childNames.get(record.childId) ?? "", mood: record.mood,
      tags: record.tags, context: record.context, durationMinutes: record.durationMinutes,
      peerInteraction: record.peerInteraction, parentInteraction: record.parentInteraction, notes: record.notes,
      occurredAt: record.occurredAt.toISOString(), source: record.source,
      createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString(), deletedAt: iso(record.deletedAt)
    })),
    audit: audits.map((record) => ({
      id: record.id, actorId: record.actorId, action: record.action, entityType: record.entityType,
      entityId: record.entityId, changedFields: auditFields(record.metadata), createdAt: record.createdAt.toISOString()
    }))
  };
}

export type HouseholdExport = Awaited<ReturnType<typeof buildHouseholdExport>>;
type Cell = string | number | boolean | null | undefined;

function csvCell(value: Cell) {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (/^[=+@]/.test(text) || /^-\D/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function csv(headers: string[], rows: Cell[][]) {
  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export function exportDomainCsv(data: HouseholdExport, domain: ExportDomain): string {
  if (domain === "children") return csv(
    ["id", "name", "birth_date", "sex", "birth_height_cm", "birth_weight_kg", "mother_height_cm", "father_height_cm", "notes", "created_at", "updated_at", "deleted_at"],
    data.children.map((r) => [r.id, r.name, r.birthDate, r.sex, r.birthHeightCm, r.birthWeightKg, r.motherHeightCm, r.fatherHeightCm, r.notes, r.createdAt, r.updatedAt, r.deletedAt])
  );
  if (domain === "growth") return csv(
    ["id", "child_id", "child_name", "measured_at", "height_cm", "weight_kg", "head_circumference_cm", "source", "place", "method", "device", "precision_note", "notes", "created_at", "updated_at", "deleted_at"],
    data.growth.map((r) => [r.id, r.childId, r.childName, r.measuredAt, r.heightCm, r.weightKg, r.headCircumferenceCm, r.source, r.place, r.method, r.device, r.precisionNote, r.notes, r.createdAt, r.updatedAt, r.deletedAt])
  );
  if (domain === "sleep") return csv(
    ["id", "child_id", "child_name", "kind", "started_at", "ended_at", "awake_minutes", "wake_count", "observation", "source", "created_at", "updated_at", "deleted_at"],
    data.sleep.map((r) => [r.id, r.childId, r.childName, r.kind, r.startedAt, r.endedAt, r.awakeMinutes, r.wakeCount, r.observation, r.source, r.createdAt, r.updatedAt, r.deletedAt])
  );
  if (domain === "meals") return csv(
    ["meal_id", "child_id", "child_name", "meal_type", "occurred_at", "appetite", "meal_notes", "source", "item_id", "food_name", "category", "offered_amount", "consumed_amount", "estimated_amount", "amount_unit", "is_new_food", "reaction_note", "deleted_at"],
    data.meals.flatMap((meal) => (meal.items.length ? meal.items : [null]).map((item) => [meal.id, meal.childId, meal.childName, meal.type, meal.occurredAt, meal.appetite, meal.notes, meal.source, item?.id, item?.name, item?.category, item?.offeredAmount, item?.consumedAmount, item?.estimatedAmount, item?.amountUnit, item?.isNewFood, item?.reactionNote, meal.deletedAt]))
  );
  if (domain === "beverages") return csv(
    ["id", "child_id", "child_name", "type", "volume_ml", "occurred_at", "notes", "source", "created_at", "updated_at", "deleted_at"],
    data.beverages.map((r) => [r.id, r.childId, r.childName, r.type, r.volumeMl, r.occurredAt, r.notes, r.source, r.createdAt, r.updatedAt, r.deletedAt])
  );
  if (domain === "activity") return csv(
    ["id", "child_id", "child_name", "activity_type", "duration_minutes", "outdoor_minutes", "intensity", "structure", "occurred_at", "engagement", "notes", "source", "created_at", "updated_at", "deleted_at"],
    data.activity.map((r) => [r.id, r.childId, r.childName, r.activityType, r.durationMinutes, r.outdoorMinutes, r.intensity, r.structure, r.occurredAt, r.engagement, r.notes, r.source, r.createdAt, r.updatedAt, r.deletedAt])
  );
  if (domain === "emotion") return csv(
    ["id", "child_id", "child_name", "mood", "tags", "context", "duration_minutes", "peer_interaction", "parent_interaction", "notes", "occurred_at", "source", "created_at", "updated_at", "deleted_at"],
    data.emotion.map((r) => [r.id, r.childId, r.childName, r.mood, r.tags.join("|"), r.context, r.durationMinutes, r.peerInteraction, r.parentInteraction, r.notes, r.occurredAt, r.source, r.createdAt, r.updatedAt, r.deletedAt])
  );
  return csv(
    ["id", "actor_id", "action", "entity_type", "entity_id", "changed_fields", "created_at"],
    data.audit.map((r) => [r.id, r.actorId, r.action, r.entityType, r.entityId, r.changedFields.join("|"), r.createdAt])
  );
}
