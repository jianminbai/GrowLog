import { getPrisma } from "@/lib/db";
import { readAuthConfig } from "@/modules/auth/auth-config";
import { createSessionRepository } from "@/modules/auth/session-repository";

import { createGrowthHandlers } from "./growth-handlers";
import {
  createGrowthWithAudit,
  findGrowthForChild,
  listGrowthForChild,
  restoreGrowthWithAudit,
  softDeleteGrowthWithAudit,
  updateGrowthWithAudit
} from "./growth-repository";

export function getGrowthHandlers() {
  const prisma = getPrisma();
  const config = readAuthConfig();
  return createGrowthHandlers({
    sessions: createSessionRepository(prisma),
    actorId: config.adminEmail,
    growth: {
      list: (householdId, childId, includeDeleted) =>
        listGrowthForChild(prisma, householdId, childId, includeDeleted),
      find: (householdId, childId, measurementId, includeDeleted) =>
        findGrowthForChild(prisma, householdId, childId, measurementId, includeDeleted),
      create: (householdId, childId, values, actorId) =>
        createGrowthWithAudit(prisma, { householdId, childId, ...values }, actorId),
      update: (householdId, childId, measurementId, values, actorId) =>
        updateGrowthWithAudit(prisma, householdId, childId, measurementId, values, actorId),
      remove: (householdId, childId, measurementId, actorId) =>
        softDeleteGrowthWithAudit(prisma, householdId, childId, measurementId, actorId),
      restore: (householdId, childId, measurementId, actorId) =>
        restoreGrowthWithAudit(prisma, householdId, childId, measurementId, actorId)
    }
  });
}
