import type { KindergartenDocument } from "@prisma/client";
import { z } from "zod";

import { ok, problem, type Failure } from "@/lib/result";
import type { SessionRepository } from "@/modules/auth/auth-service";
import { RequestAuthError, requireRequestAuth } from "@/modules/auth/request-auth";

import { MultipartBodyError, readBoundedFormData } from "./bounded-form-data";
import { DocumentFileStoreError, type DocumentFileStore } from "./document-file-store";
import {
  documentUploadFieldsSchema,
  normalizePeriodStart,
  validateImage
} from "./document-record";
import type { StoredDocumentValues, UpsertDocumentResult } from "./document-repository";

export type KindergartenDocumentOperations = {
  list(householdId: string, childId: string): Promise<KindergartenDocument[]>;
  find(householdId: string, documentId: string): Promise<KindergartenDocument | null>;
  upsert(householdId: string, values: StoredDocumentValues, actorId: string): Promise<UpsertDocumentResult | null>;
  remove(householdId: string, documentId: string, actorId: string): Promise<{ deletedStorageKey: string } | null>;
};

export type KindergartenDocumentHandlerDependencies = {
  sessions: SessionRepository;
  actorId: string;
  documents: KindergartenDocumentOperations;
  files: DocumentFileStore;
};

export type KindergartenDocumentDto = {
  id: string;
  childId: string;
  type: KindergartenDocument["type"];
  periodStart: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
  imageUrl: string;
};

const maximumMultipartBytes = 11 * 1024 * 1024;
const privateHeaders = { "cache-control": "private, no-store, max-age=0" };

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: privateHeaders });
}

function jsonProblem(failure: Failure): Response {
  return json({ error: failure.error }, failure.status);
}

function authProblem(error: unknown): Response | null {
  return error instanceof RequestAuthError
    ? jsonProblem(problem(error.code, error.message, error.status))
    : null;
}

function validationProblem(fields?: Record<string, string[]>): Response {
  return jsonProblem(problem("VALIDATION_ERROR", "Please check the submitted fields.", 400, fields));
}

function notFound(): Response {
  return jsonProblem(problem("NOT_FOUND", "Kindergarten document not found.", 404));
}

export function serializeKindergartenDocument(record: KindergartenDocument): KindergartenDocumentDto {
  const updatedAt = record.updatedAt.toISOString();
  return {
    id: record.id,
    childId: record.childId,
    type: record.type,
    periodStart: record.periodStart.toISOString().slice(0, 10),
    originalFileName: record.originalFileName,
    mimeType: record.mimeType,
    sizeBytes: record.sizeBytes,
    createdAt: record.createdAt.toISOString(),
    updatedAt,
    imageUrl: `/api/kindergarten-documents/${encodeURIComponent(record.id)}/image?v=${encodeURIComponent(updatedAt)}`
  };
}

export function createKindergartenDocumentHandlers(dependencies: KindergartenDocumentHandlerDependencies) {
  return {
    async list(request: Request): Promise<Response> {
      try {
        const session = await requireRequestAuth(request, dependencies.sessions);
        const childId = new URL(request.url).searchParams.get("childId")?.trim() ?? "";
        if (!childId) return validationProblem({ childId: ["Choose a child."] });
        const records = await dependencies.documents.list(session.householdId, childId);
        return json(ok({ documents: records.map(serializeKindergartenDocument) }));
      } catch (error) {
        const response = authProblem(error);
        if (response) return response;
        throw error;
      }
    },

    async upload(request: Request): Promise<Response> {
      try {
        const session = await requireRequestAuth(request, dependencies.sessions, { mutation: true });
        let form: FormData;
        try {
          form = await readBoundedFormData(request, maximumMultipartBytes);
        } catch (error) {
          if (error instanceof MultipartBodyError) {
            return jsonProblem(problem(error.code, error.message, error.status));
          }
          throw error;
        }

        const parsed = documentUploadFieldsSchema.safeParse({
          childId: form.get("childId"),
          type: form.get("type"),
          date: form.get("date")
        });
        if (!parsed.success) return validationProblem(z.flattenError(parsed.error).fieldErrors);
        const images = form.getAll("image");
        if (images.length !== 1 || !(images[0] instanceof File)) {
          return validationProblem({ image: ["Upload exactly one image."] });
        }

        let image;
        try {
          image = await validateImage(images[0]);
        } catch {
          return validationProblem({ image: ["Upload a valid JPEG, PNG, or WebP image no larger than 10 MiB."] });
        }

        const storageKey = await dependencies.files.write(image.bytes, image.extension);
        let result: UpsertDocumentResult | null;
        try {
          result = await dependencies.documents.upsert(session.householdId, {
            childId: parsed.data.childId,
            type: parsed.data.type,
            periodStart: normalizePeriodStart(parsed.data.type, parsed.data.date),
            originalFileName: image.originalFileName,
            storageKey,
            mimeType: image.mimeType,
            sizeBytes: image.sizeBytes
          }, dependencies.actorId);
        } catch (error) {
          await dependencies.files.remove(storageKey).catch(() => undefined);
          throw error;
        }
        if (!result) {
          await dependencies.files.remove(storageKey).catch(() => undefined);
          return notFound();
        }
        if (result.replacedStorageKey && result.replacedStorageKey !== storageKey) {
          await dependencies.files.remove(result.replacedStorageKey).catch(() => undefined);
        }
        return json(ok({ document: serializeKindergartenDocument(result.document) }), result.created ? 201 : 200);
      } catch (error) {
        const response = authProblem(error);
        if (response) return response;
        throw error;
      }
    },

    async image(request: Request, documentId: string): Promise<Response> {
      try {
        const session = await requireRequestAuth(request, dependencies.sessions);
        const record = await dependencies.documents.find(session.householdId, documentId);
        if (!record) return notFound();
        try {
          const bytes = await dependencies.files.read(record.storageKey);
          return new Response(Uint8Array.from(bytes).buffer, {
            headers: {
              ...privateHeaders,
              "content-type": record.mimeType,
              "content-length": String(bytes.byteLength),
              "content-disposition": "inline",
              "x-content-type-options": "nosniff"
            }
          });
        } catch (error) {
          if (error instanceof DocumentFileStoreError && error.code === "NOT_FOUND") return notFound();
          throw error;
        }
      } catch (error) {
        const response = authProblem(error);
        if (response) return response;
        throw error;
      }
    },

    async remove(request: Request, documentId: string): Promise<Response> {
      try {
        const session = await requireRequestAuth(request, dependencies.sessions, { mutation: true });
        const result = await dependencies.documents.remove(session.householdId, documentId, dependencies.actorId);
        if (!result) return notFound();
        await dependencies.files.remove(result.deletedStorageKey).catch(() => undefined);
        return json(ok({ deletedId: documentId }));
      } catch (error) {
        const response = authProblem(error);
        if (response) return response;
        throw error;
      }
    }
  };
}
