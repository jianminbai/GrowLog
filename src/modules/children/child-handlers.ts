import { z } from "zod";

import { ok, problem, type Failure } from "@/lib/result";
import {
  RequestAuthError,
  requireRequestAuth
} from "@/modules/auth/request-auth";
import type { SessionRepository } from "@/modules/auth/auth-service";

import { childCreateSchema, childUpdateSchema, type ChildCreateValues, type ChildUpdateValues } from "./child-profile";
import type { StoredChild } from "./child-repository";

export type ChildOperations = {
  list(householdId: string): Promise<StoredChild[]>;
  find(householdId: string, childId: string): Promise<StoredChild | null>;
  create(
    householdId: string,
    values: ChildCreateValues,
    actorId: string
  ): Promise<StoredChild>;
  update(
    householdId: string,
    childId: string,
    values: ChildUpdateValues,
    actorId: string
  ): Promise<StoredChild | null>;
};

export type ChildHandlerDependencies = {
  sessions: SessionRepository;
  actorId: string;
  children: ChildOperations;
};

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

function jsonProblem(failure: Failure): Response {
  return json({ error: failure.error }, failure.status);
}

function authProblem(error: unknown): Response | null {
  if (!(error instanceof RequestAuthError)) return null;
  return jsonProblem(problem(error.code, error.message, error.status));
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

export type ChildProfileDto = {
  id: string;
  name: string;
  birthDate: string;
  sex: StoredChild["sex"];
  birthHeightCm: number | null;
  birthWeightKg: number | null;
  motherHeightCm: number | null;
  fatherHeightCm: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export function serializeChild(child: StoredChild): ChildProfileDto {
  const decimal = (value: StoredChild["birthHeightCm"]) =>
    value === null ? null : Number(value.toString());
  return {
    id: child.id,
    name: child.name,
    birthDate: child.birthDate.toISOString().slice(0, 10),
    sex: child.sex,
    birthHeightCm: decimal(child.birthHeightCm),
    birthWeightKg: decimal(child.birthWeightKg),
    motherHeightCm: decimal(child.motherHeightCm),
    fatherHeightCm: decimal(child.fatherHeightCm),
    notes: child.notes,
    createdAt: child.createdAt.toISOString(),
    updatedAt: child.updatedAt.toISOString()
  };
}

export function createChildHandlers(dependencies: ChildHandlerDependencies) {
  return {
    async list(request: Request): Promise<Response> {
      try {
        const session = await requireRequestAuth(request, dependencies.sessions);
        const children = await dependencies.children.list(session.householdId);
        return json(ok({ children: children.map(serializeChild) }));
      } catch (error) {
        const response = authProblem(error);
        if (response) return response;
        throw error;
      }
    },

    async get(request: Request, childId: string): Promise<Response> {
      try {
        const session = await requireRequestAuth(request, dependencies.sessions);
        const child = await dependencies.children.find(session.householdId, childId);
        if (!child) return jsonProblem(problem("NOT_FOUND", "Child profile not found.", 404));
        return json(ok({ child: serializeChild(child) }));
      } catch (error) {
        const response = authProblem(error);
        if (response) return response;
        throw error;
      }
    },

    async create(request: Request): Promise<Response> {
      try {
        const session = await requireRequestAuth(request, dependencies.sessions, { mutation: true });
        const parsed = childCreateSchema.safeParse(await readJson(request));
        if (!parsed.success) {
          return jsonProblem(
            problem(
              "VALIDATION_ERROR",
              "Please check the submitted fields.",
              400,
              z.flattenError(parsed.error).fieldErrors
            )
          );
        }
        const child = await dependencies.children.create(
          session.householdId,
          parsed.data,
          dependencies.actorId
        );
        return json(ok({ child: serializeChild(child) }), 201);
      } catch (error) {
        const response = authProblem(error);
        if (response) return response;
        throw error;
      }
    },

    async update(request: Request, childId: string): Promise<Response> {
      try {
        const session = await requireRequestAuth(request, dependencies.sessions, { mutation: true });
        const parsed = childUpdateSchema.safeParse(await readJson(request));
        if (!parsed.success) {
          return jsonProblem(
            problem(
              "VALIDATION_ERROR",
              "Please check the submitted fields.",
              400,
              z.flattenError(parsed.error).fieldErrors
            )
          );
        }
        const child = await dependencies.children.update(
          session.householdId,
          childId,
          parsed.data,
          dependencies.actorId
        );
        if (!child) return jsonProblem(problem("NOT_FOUND", "Child profile not found.", 404));
        return json(ok({ child: serializeChild(child) }));
      } catch (error) {
        const response = authProblem(error);
        if (response) return response;
        throw error;
      }
    }
  };
}
