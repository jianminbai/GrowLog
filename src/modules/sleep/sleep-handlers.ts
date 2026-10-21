import type { SleepSession } from "@prisma/client";
import { z } from "zod";
import { ok, problem } from "@/lib/result";
import type { SessionRepository } from "@/modules/auth/auth-service";
import { RequestAuthError, requireRequestAuth } from "@/modules/auth/request-auth";
import {
  calculateSleepMinutes,
  dateInTimeZone,
  sleepCreateSchema,
  sleepUpdateSchema,
  summarizeSleep,
  type SleepCreateValues,
  type SleepUpdateValues
} from "./sleep-record";

export type SleepOperations = {
  list(householdId: string, childId: string, includeDeleted: boolean): Promise<SleepSession[]>;
  find(householdId: string, childId: string, sessionId: string, includeDeleted: boolean): Promise<SleepSession | null>;
  create(householdId: string, childId: string, values: SleepCreateValues, actorId: string): Promise<SleepSession | null>;
  update(householdId: string, childId: string, sessionId: string, values: SleepUpdateValues, actorId: string): Promise<SleepSession | null>;
  remove(householdId: string, childId: string, sessionId: string, actorId: string): Promise<SleepSession | null>;
  restore(householdId: string, childId: string, sessionId: string, actorId: string): Promise<SleepSession | null>;
  timeZone(householdId: string): Promise<string>;
};
export type SleepHandlerDependencies = { sessions: SessionRepository; actorId: string; sleep: SleepOperations };

export function serializeSleep(record: SleepSession) {
  return {
    id: record.id, childId: record.childId, kind: record.kind,
    startedAt: record.startedAt.toISOString(), endedAt: record.endedAt.toISOString(),
    awakeMinutes: record.awakeMinutes, wakeCount: record.wakeCount,
    sleepMinutes: calculateSleepMinutes(record.startedAt, record.endedAt, record.awakeMinutes),
    observation: record.observation, source: record.source,
    deletedAt: record.deletedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString()
  };
}

function json(body: unknown, status = 200) { return Response.json(body, { status }); }
function failure(code: string, message: string, status: number, fields?: Record<string, string[]>) {
  const value = problem(code, message, status, fields);
  return json({ error: value.error }, status);
}
function errorResponse(error: unknown) {
  return error instanceof RequestAuthError ? failure(error.code, error.message, error.status) : null;
}
async function body(request: Request) { try { return await request.json(); } catch { return undefined; } }
function invalid(error: z.ZodError) {
  return failure("VALIDATION_ERROR", "Please check the submitted fields.", 400, z.flattenError(error).fieldErrors);
}
function missing() { return failure("NOT_FOUND", "Sleep record not found.", 404); }

export function createSleepHandlers(dependencies: SleepHandlerDependencies) {
  return {
    async list(request: Request, childId: string) {
      try {
        const session = await requireRequestAuth(request, dependencies.sessions);
        const url = new URL(request.url);
        const includeDeleted = url.searchParams.get("includeDeleted") === "true";
        const records = await dependencies.sleep.list(session.householdId, childId, includeDeleted);
        const timeZone = await dependencies.sleep.timeZone(session.householdId);
        const asOf = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get("asOf") ?? "")
          ? url.searchParams.get("asOf")!
          : dateInTimeZone(new Date(), timeZone);
        const active = records.filter((record) => !record.deletedAt);
        return json(ok({
          sessions: records.map(serializeSleep),
          summary: summarizeSleep(active, timeZone, asOf),
          timeZone
        }));
      } catch (error) { const response = errorResponse(error); if (response) return response; throw error; }
    },
    async create(request: Request, childId: string) {
      try {
        const session = await requireRequestAuth(request, dependencies.sessions, { mutation: true });
        const parsed = sleepCreateSchema.safeParse(await body(request));
        if (!parsed.success) return invalid(parsed.error);
        const record = await dependencies.sleep.create(session.householdId, childId, parsed.data, dependencies.actorId);
        return record ? json(ok({ session: serializeSleep(record) }), 201) : missing();
      } catch (error) { const response = errorResponse(error); if (response) return response; throw error; }
    },
    async update(request: Request, childId: string, sessionId: string) {
      try {
        const auth = await requireRequestAuth(request, dependencies.sessions, { mutation: true });
        const patch = sleepUpdateSchema.safeParse(await body(request));
        if (!patch.success) return invalid(patch.error);
        const existing = await dependencies.sleep.find(auth.householdId, childId, sessionId, false);
        if (!existing) return missing();
        const merged = sleepCreateSchema.safeParse({
          kind: existing.kind, startedAt: existing.startedAt.toISOString(), endedAt: existing.endedAt.toISOString(),
          awakeMinutes: existing.awakeMinutes, wakeCount: existing.wakeCount,
          observation: existing.observation, source: existing.source,
          ...Object.fromEntries(Object.entries(patch.data).map(([key, value]) =>
            [key, value instanceof Date ? value.toISOString() : value]))
        });
        if (!merged.success) return invalid(merged.error);
        const record = await dependencies.sleep.update(auth.householdId, childId, sessionId, patch.data, dependencies.actorId);
        return record ? json(ok({ session: serializeSleep(record) })) : missing();
      } catch (error) { const response = errorResponse(error); if (response) return response; throw error; }
    },
    async remove(request: Request, childId: string, sessionId: string) {
      try {
        const auth = await requireRequestAuth(request, dependencies.sessions, { mutation: true });
        const record = await dependencies.sleep.remove(auth.householdId, childId, sessionId, dependencies.actorId);
        return record ? json(ok({ session: serializeSleep(record) })) : missing();
      } catch (error) { const response = errorResponse(error); if (response) return response; throw error; }
    },
    async restore(request: Request, childId: string, sessionId: string) {
      try {
        const auth = await requireRequestAuth(request, dependencies.sessions, { mutation: true });
        const record = await dependencies.sleep.restore(auth.householdId, childId, sessionId, dependencies.actorId);
        return record ? json(ok({ session: serializeSleep(record) })) : missing();
      } catch (error) { const response = errorResponse(error); if (response) return response; throw error; }
    }
  };
}
