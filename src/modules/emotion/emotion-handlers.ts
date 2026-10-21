import type { EmotionRecord } from "@prisma/client";
import { z } from "zod";

import { ok, problem } from "@/lib/result";
import type { SessionRepository } from "@/modules/auth/auth-service";
import { RequestAuthError, requireRequestAuth } from "@/modules/auth/request-auth";
import { dateInTimeZone } from "@/modules/sleep/sleep-record";

import {
  emotionCreateSchema,
  emotionUpdateSchema,
  summarizeEmotions,
  type EmotionCreateValues,
  type EmotionUpdateValues
} from "./emotion-record";

export type EmotionOperations = {
  list(householdId: string, childId: string, includeDeleted: boolean): Promise<EmotionRecord[]>;
  create(householdId: string, childId: string, values: EmotionCreateValues, actorId: string): Promise<EmotionRecord | null>;
  update(householdId: string, childId: string, emotionId: string, values: EmotionUpdateValues, actorId: string): Promise<EmotionRecord | null>;
  remove(householdId: string, childId: string, emotionId: string, actorId: string): Promise<EmotionRecord | null>;
  restore(householdId: string, childId: string, emotionId: string, actorId: string): Promise<EmotionRecord | null>;
  timeZone(householdId: string): Promise<string>;
};

export type EmotionHandlerDependencies = {
  sessions: SessionRepository;
  actorId: string;
  emotion: EmotionOperations;
};

export function serializeEmotion(record: EmotionRecord) {
  return {
    id: record.id,
    childId: record.childId,
    mood: record.mood,
    tags: record.tags,
    context: record.context,
    durationMinutes: record.durationMinutes,
    peerInteraction: record.peerInteraction,
    parentInteraction: record.parentInteraction,
    notes: record.notes,
    occurredAt: record.occurredAt.toISOString(),
    source: record.source,
    deletedAt: record.deletedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString()
  };
}

const json = (value: unknown, status = 200) => Response.json(value, { status });
const failure = (code: string, message: string, status: number, fields?: Record<string, string[]>) =>
  json({ error: problem(code, message, status, fields).error }, status);
const missing = () => failure("NOT_FOUND", "Emotion record not found.", 404);
const invalid = (error: z.ZodError) => failure(
  "VALIDATION_ERROR", "Please check the submitted fields.", 400, z.flattenError(error).fieldErrors
);
const authFailure = (error: unknown) => error instanceof RequestAuthError
  ? failure(error.code, error.message, error.status)
  : null;
async function requestBody(request: Request) {
  try { return await request.json(); } catch { return undefined; }
}

export function createEmotionHandlers(dependencies: EmotionHandlerDependencies) {
  return {
    async list(request: Request, childId: string) {
      try {
        const auth = await requireRequestAuth(request, dependencies.sessions);
        const url = new URL(request.url);
        const includeDeleted = url.searchParams.get("includeDeleted") === "true";
        const [records, timeZone] = await Promise.all([
          dependencies.emotion.list(auth.householdId, childId, includeDeleted),
          dependencies.emotion.timeZone(auth.householdId)
        ]);
        const asOf = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get("asOf") ?? "")
          ? url.searchParams.get("asOf")!
          : dateInTimeZone(new Date(), timeZone);
        return json(ok({
          emotions: records.map(serializeEmotion),
          summary: summarizeEmotions(records.filter((record) => !record.deletedAt), timeZone, asOf),
          timeZone,
          asOf
        }));
      } catch (error) { const response = authFailure(error); if (response) return response; throw error; }
    },

    async create(request: Request, childId: string) {
      try {
        const auth = await requireRequestAuth(request, dependencies.sessions, { mutation: true });
        const parsed = emotionCreateSchema.safeParse(await requestBody(request));
        if (!parsed.success) return invalid(parsed.error);
        const record = await dependencies.emotion.create(auth.householdId, childId, parsed.data, dependencies.actorId);
        return record ? json(ok({ emotion: serializeEmotion(record) }), 201) : missing();
      } catch (error) { const response = authFailure(error); if (response) return response; throw error; }
    },

    async update(request: Request, childId: string, emotionId: string) {
      try {
        const auth = await requireRequestAuth(request, dependencies.sessions, { mutation: true });
        const parsed = emotionUpdateSchema.safeParse(await requestBody(request));
        if (!parsed.success) return invalid(parsed.error);
        const record = await dependencies.emotion.update(
          auth.householdId, childId, emotionId, parsed.data, dependencies.actorId
        );
        return record ? json(ok({ emotion: serializeEmotion(record) })) : missing();
      } catch (error) { const response = authFailure(error); if (response) return response; throw error; }
    },

    async remove(request: Request, childId: string, emotionId: string) {
      try {
        const auth = await requireRequestAuth(request, dependencies.sessions, { mutation: true });
        const record = await dependencies.emotion.remove(auth.householdId, childId, emotionId, dependencies.actorId);
        return record ? json(ok({ emotion: serializeEmotion(record) })) : missing();
      } catch (error) { const response = authFailure(error); if (response) return response; throw error; }
    },

    async restore(request: Request, childId: string, emotionId: string) {
      try {
        const auth = await requireRequestAuth(request, dependencies.sessions, { mutation: true });
        const record = await dependencies.emotion.restore(auth.householdId, childId, emotionId, dependencies.actorId);
        return record ? json(ok({ emotion: serializeEmotion(record) })) : missing();
      } catch (error) { const response = authFailure(error); if (response) return response; throw error; }
    }
  };
}
