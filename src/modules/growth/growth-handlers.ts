import type { GrowthMeasurement } from "@prisma/client";
import { z } from "zod";

import { ok, problem, type Failure } from "@/lib/result";
import type { SessionRepository } from "@/modules/auth/auth-service";
import { RequestAuthError, requireRequestAuth } from "@/modules/auth/request-auth";

import {
  calculateBmi,
  calculateGrowthChanges,
  growthCreateSchema,
  growthUpdateSchema,
  type GrowthCreateValues,
  type GrowthUpdateValues
} from "./growth-record";

export type GrowthOperations = {
  list(householdId: string, childId: string, includeDeleted: boolean): Promise<GrowthMeasurement[]>;
  find(householdId: string, childId: string, measurementId: string, includeDeleted: boolean): Promise<GrowthMeasurement | null>;
  create(householdId: string, childId: string, values: GrowthCreateValues, actorId: string): Promise<GrowthMeasurement | null>;
  update(householdId: string, childId: string, measurementId: string, values: GrowthUpdateValues, actorId: string): Promise<GrowthMeasurement | null>;
  remove(householdId: string, childId: string, measurementId: string, actorId: string): Promise<GrowthMeasurement | null>;
  restore(householdId: string, childId: string, measurementId: string, actorId: string): Promise<GrowthMeasurement | null>;
};

export type GrowthHandlerDependencies = {
  sessions: SessionRepository;
  actorId: string;
  growth: GrowthOperations;
};

export type GrowthMeasurementDto = {
  id: string;
  childId: string;
  measuredAt: string;
  heightCm: number | null;
  weightKg: number | null;
  headCircumferenceCm: number | null;
  bmi: number | null;
  heightChangeCm: number | null;
  weightChangeKg: number | null;
  source: GrowthMeasurement["source"];
  place: string | null;
  method: string | null;
  device: string | null;
  precisionNote: string | null;
  notes: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function decimal(value: GrowthMeasurement["heightCm"]): number | null {
  return value === null ? null : Number(value.toString());
}

export function serializeGrowth(
  record: GrowthMeasurement,
  changes = { heightChangeCm: null as number | null, weightChangeKg: null as number | null }
): GrowthMeasurementDto {
  const heightCm = decimal(record.heightCm);
  const weightKg = decimal(record.weightKg);
  return {
    id: record.id,
    childId: record.childId,
    measuredAt: record.measuredAt.toISOString(),
    heightCm,
    weightKg,
    headCircumferenceCm: decimal(record.headCircumferenceCm),
    bmi: calculateBmi(heightCm, weightKg),
    ...changes,
    source: record.source,
    place: record.place,
    method: record.method,
    device: record.device,
    precisionNote: record.precisionNote,
    notes: record.notes,
    deletedAt: record.deletedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString()
  };
}

export function serializeGrowthHistory(records: GrowthMeasurement[]): GrowthMeasurementDto[] {
  const changes = calculateGrowthChanges(
    records.map((record) => ({
      heightCm: decimal(record.heightCm),
      weightKg: decimal(record.weightKg)
    }))
  );
  return records.map((record, index) => serializeGrowth(record, changes[index]));
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

function jsonProblem(failure: Failure): Response {
  return json({ error: failure.error }, failure.status);
}

function authProblem(error: unknown): Response | null {
  return error instanceof RequestAuthError
    ? jsonProblem(problem(error.code, error.message, error.status))
    : null;
}

function validationProblem(error: z.ZodError): Response {
  return jsonProblem(
    problem(
      "VALIDATION_ERROR",
      "Please check the submitted fields.",
      400,
      z.flattenError(error).fieldErrors
    )
  );
}

async function readJson(request: Request): Promise<unknown> {
  try { return await request.json(); } catch { return undefined; }
}

function notFound(): Response {
  return jsonProblem(problem("NOT_FOUND", "Growth measurement not found.", 404));
}

export function createGrowthHandlers(dependencies: GrowthHandlerDependencies) {
  return {
    async list(request: Request, childId: string): Promise<Response> {
      try {
        const session = await requireRequestAuth(request, dependencies.sessions);
        const includeDeleted = new URL(request.url).searchParams.get("includeDeleted") === "true";
        const records = await dependencies.growth.list(session.householdId, childId, includeDeleted);
        return json(ok({ measurements: serializeGrowthHistory(records) }));
      } catch (error) {
        const response = authProblem(error);
        if (response) return response;
        throw error;
      }
    },

    async get(request: Request, childId: string, measurementId: string): Promise<Response> {
      try {
        const session = await requireRequestAuth(request, dependencies.sessions);
        const record = await dependencies.growth.find(
          session.householdId,
          childId,
          measurementId,
          new URL(request.url).searchParams.get("includeDeleted") === "true"
        );
        return record ? json(ok({ measurement: serializeGrowth(record) })) : notFound();
      } catch (error) {
        const response = authProblem(error);
        if (response) return response;
        throw error;
      }
    },

    async create(request: Request, childId: string): Promise<Response> {
      try {
        const session = await requireRequestAuth(request, dependencies.sessions, { mutation: true });
        const parsed = growthCreateSchema.safeParse(await readJson(request));
        if (!parsed.success) return validationProblem(parsed.error);
        const record = await dependencies.growth.create(
          session.householdId,
          childId,
          parsed.data,
          dependencies.actorId
        );
        return record ? json(ok({ measurement: serializeGrowth(record) }), 201) : notFound();
      } catch (error) {
        const response = authProblem(error);
        if (response) return response;
        throw error;
      }
    },

    async update(request: Request, childId: string, measurementId: string): Promise<Response> {
      try {
        const session = await requireRequestAuth(request, dependencies.sessions, { mutation: true });
        const parsed = growthUpdateSchema.safeParse(await readJson(request));
        if (!parsed.success) return validationProblem(parsed.error);
        const record = await dependencies.growth.update(
          session.householdId,
          childId,
          measurementId,
          parsed.data,
          dependencies.actorId
        );
        return record ? json(ok({ measurement: serializeGrowth(record) })) : notFound();
      } catch (error) {
        const response = authProblem(error);
        if (response) return response;
        throw error;
      }
    },

    async remove(request: Request, childId: string, measurementId: string): Promise<Response> {
      try {
        const session = await requireRequestAuth(request, dependencies.sessions, { mutation: true });
        const record = await dependencies.growth.remove(
          session.householdId,
          childId,
          measurementId,
          dependencies.actorId
        );
        return record ? json(ok({ measurement: serializeGrowth(record) })) : notFound();
      } catch (error) {
        const response = authProblem(error);
        if (response) return response;
        throw error;
      }
    },

    async restore(request: Request, childId: string, measurementId: string): Promise<Response> {
      try {
        const session = await requireRequestAuth(request, dependencies.sessions, { mutation: true });
        const record = await dependencies.growth.restore(
          session.householdId,
          childId,
          measurementId,
          dependencies.actorId
        );
        return record ? json(ok({ measurement: serializeGrowth(record) })) : notFound();
      } catch (error) {
        const response = authProblem(error);
        if (response) return response;
        throw error;
      }
    }
  };
}
