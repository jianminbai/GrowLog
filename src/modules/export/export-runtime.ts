import { getPrisma } from "@/lib/db";
import { createSessionRepository } from "@/modules/auth/session-repository";

import { createExportHandlers } from "./export-handlers";
import { buildHouseholdExport } from "./export-service";

export function getExportHandlers() {
  const prisma = getPrisma();
  return createExportHandlers({
    sessions: createSessionRepository(prisma),
    load: (householdId, includeDeleted) => buildHouseholdExport(prisma, householdId, includeDeleted)
  });
}
