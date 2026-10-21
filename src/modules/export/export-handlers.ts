import { problem } from "@/lib/result";
import type { SessionRepository } from "@/modules/auth/auth-service";
import { RequestAuthError, requireRequestAuth } from "@/modules/auth/request-auth";

import { exportDomainCsv, exportDomains, type ExportDomain, type HouseholdExport } from "./export-service";

export type ExportHandlerDependencies = {
  sessions: SessionRepository;
  load(householdId: string, includeDeleted: boolean): Promise<HouseholdExport>;
};

const attachment = (body: string, type: string, filename: string, status = 200) => new Response(body, {
  status,
  headers: {
    "content-type": type,
    "content-disposition": `attachment; filename="${filename}"`,
    "cache-control": "private, no-store, max-age=0"
  }
});
const failure = (code: string, message: string, status: number) => Response.json(
  { error: problem(code, message, status).error },
  { status, headers: { "cache-control": "private, no-store, max-age=0" } }
);
const authFailure = (error: unknown) => error instanceof RequestAuthError
  ? failure(error.code, error.message, error.status)
  : null;
const fileDate = () => new Date().toISOString().slice(0, 10);

export function createExportHandlers(dependencies: ExportHandlerDependencies) {
  return {
    async json(request: Request) {
      try {
        const auth = await requireRequestAuth(request, dependencies.sessions);
        const includeDeleted = new URL(request.url).searchParams.get("includeDeleted") === "true";
        const data = await dependencies.load(auth.householdId, includeDeleted);
        return attachment(JSON.stringify(data, null, 2), "application/json; charset=utf-8", `growlog-${fileDate()}.json`);
      } catch (error) { const response = authFailure(error); if (response) return response; throw error; }
    },
    async csv(request: Request) {
      try {
        const auth = await requireRequestAuth(request, dependencies.sessions);
        const url = new URL(request.url);
        const domain = url.searchParams.get("domain");
        if (!exportDomains.includes(domain as ExportDomain)) {
          return failure("VALIDATION_ERROR", "Choose a supported export domain.", 400);
        }
        const includeDeleted = url.searchParams.get("includeDeleted") === "true";
        const data = await dependencies.load(auth.householdId, includeDeleted);
        const csv = `\uFEFF${exportDomainCsv(data, domain as ExportDomain)}`;
        return attachment(csv, "text/csv; charset=utf-8", `growlog-${domain}-${fileDate()}.csv`);
      } catch (error) { const response = authFailure(error); if (response) return response; throw error; }
    }
  };
}
