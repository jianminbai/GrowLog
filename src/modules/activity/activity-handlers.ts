import type { PhysicalActivity } from "@prisma/client";
import { z } from "zod";

import { ok, problem } from "@/lib/result";
import type { SessionRepository } from "@/modules/auth/auth-service";
import { RequestAuthError, requireRequestAuth } from "@/modules/auth/request-auth";
import { dateInTimeZone } from "@/modules/sleep/sleep-record";

import {
  activityCreateSchema,
  activityUpdateSchema,
  summarizeActivity,
  type ActivityCreateValues,
  type ActivityUpdateValues
} from "./activity-record";

export type ActivityOperations = {
  list(householdId: string, childId: string, includeDeleted: boolean): Promise<PhysicalActivity[]>;
  find(householdId: string, childId: string, activityId: string, includeDeleted: boolean): Promise<PhysicalActivity | null>;
  create(householdId: string, childId: string, values: ActivityCreateValues, actorId: string): Promise<PhysicalActivity | null>;
  update(householdId: string, childId: string, activityId: string, values: ActivityUpdateValues, actorId: string): Promise<PhysicalActivity | null>;
  remove(householdId: string, childId: string, activityId: string, actorId: string): Promise<PhysicalActivity | null>;
  restore(householdId: string, childId: string, activityId: string, actorId: string): Promise<PhysicalActivity | null>;
  timeZone(householdId: string): Promise<string>;
};

export type ActivityHandlerDependencies = {
  sessions: SessionRepository;
  actorId: string;
  activity: ActivityOperations;
};

export function serializeActivity(record: PhysicalActivity) {
  return {
    id: record.id,
    childId: record.childId,
    activityType: record.activityType,
    durationMinutes: record.durationMinutes,
    outdoorMinutes: record.outdoorMinutes,
    intensity: record.intensity,
    structure: record.structure,
    occurredAt: record.occurredAt.toISOString(),
    engagement: record.engagement,
    notes: record.notes,
    source: record.source,
    deletedAt: record.deletedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString()
  };
}

const json = (value: unknown, status = 200) => Response.json(value, { status });
const failure = (code: string, message: string, status: number, fields?: Record<string, string[]>) =>
  json({ error: problem(code, message, status, fields).error }, status);
const missing = () => failure("NOT_FOUND", "Activity record not found.", 404);
const invalid = (error: z.ZodError) => failure(
  "VALIDATION_ERROR", "Please check the submitted fields.", 400, z.flattenError(error).fieldErrors
);
const authFailure = (error: unknown) => error instanceof RequestAuthError
  ? failure(error.code, error.message, error.status)
  : null;
async function requestBody(request: Request) {
  try { return await request.json(); } catch { return undefined; }
}

export function createActivityHandlers(dependencies: ActivityHandlerDependencies) {
  return {
    async list(request: Request, childId: string) {
      try {
        const auth = await requireRequestAuth(request, dependencies.sessions);
        const url = new URL(request.url);
        const includeDeleted = url.searchParams.get("includeDeleted") === "true";
        const [records, timeZone] = await Promise.all([
          dependencies.activity.list(auth.householdId, childId, includeDeleted),
          dependencies.activity.timeZone(auth.householdId)
        ]);
        const asOf = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get("asOf") ?? "")
          ? url.searchParams.get("asOf")!
          : dateInTimeZone(new Date(), timeZone);
        return json(ok({
          activities: records.map(serializeActivity),
          summary: summarizeActivity(records.filter((record) => !record.deletedAt), timeZone, asOf),
          timeZone,
          asOf
        }));
      } catch (error) { const response = authFailure(error); if (response) return response; throw error; }
    },

    async create(request: Request, childId: string) {
      try {
        const auth = await requireRequestAuth(request, dependencies.sessions, { mutation: true });
        const parsed = activityCreateSchema.safeParse(await requestBody(request));
        if (!parsed.success) return invalid(parsed.error);
        const record = await dependencies.activity.create(
          auth.householdId, childId, parsed.data, dependencies.actorId
        );
        return record ? json(ok({ activity: serializeActivity(record) }), 201) : missing();
      } catch (error) { const response = authFailure(error); if (response) return response; throw error; }
    },

    async update(request: Request, childId: string, activityId: string) {
      try {
        const auth = await requireRequestAuth(request, dependencies.sessions, { mutation: true });
        const patch = activityUpdateSchema.safeParse(await requestBody(request));
        if (!patch.success) return invalid(patch.error);
        const existing = await dependencies.activity.find(auth.householdId, childId, activityId, false);
        if (!existing) return missing();
        const merged = activityCreateSchema.safeParse({
          activityType: existing.activityType,
          durationMinutes: existing.durationMinutes,
          outdoorMinutes: existing.outdoorMinutes,
          intensity: existing.intensity,
          structure: existing.structure,
          occurredAt: existing.occurredAt.toISOString(),
          engagement: existing.engagement,
          notes: existing.notes,
          source: existing.source,
          ...Object.fromEntries(Object.entries(patch.data).map(([key, value]) =>
            [key, value instanceof Date ? value.toISOString() : value]))
        });
        if (!merged.success) return invalid(merged.error);
        const record = await dependencies.activity.update(
          auth.householdId, childId, activityId, patch.data, dependencies.actorId
        );
        return record ? json(ok({ activity: serializeActivity(record) })) : missing();
      } catch (error) { const response = authFailure(error); if (response) return response; throw error; }
    },

    async remove(request: Request, childId: string, activityId: string) {
      try {
        const auth = await requireRequestAuth(request, dependencies.sessions, { mutation: true });
        const record = await dependencies.activity.remove(auth.householdId, childId, activityId, dependencies.actorId);
        return record ? json(ok({ activity: serializeActivity(record) })) : missing();
      } catch (error) { const response = authFailure(error); if (response) return response; throw error; }
    },

    async restore(request: Request, childId: string, activityId: string) {
      try {
        const auth = await requireRequestAuth(request, dependencies.sessions, { mutation: true });
        const record = await dependencies.activity.restore(auth.householdId, childId, activityId, dependencies.actorId);
        return record ? json(ok({ activity: serializeActivity(record) })) : missing();
      } catch (error) { const response = authFailure(error); if (response) return response; throw error; }
    }
  };
}
