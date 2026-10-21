import { getPrisma } from "@/lib/db";
import { readAuthConfig } from "@/modules/auth/auth-config";
import { createSessionRepository } from "@/modules/auth/session-repository";
import { createSleepHandlers } from "./sleep-handlers";
import {
  createSleepWithAudit, findSleepForChild, getHouseholdTimeZone, listSleepForChild,
  restoreSleepWithAudit, softDeleteSleepWithAudit, updateSleepWithAudit
} from "./sleep-repository";

export function getSleepHandlers() {
  const prisma = getPrisma();
  const config = readAuthConfig();
  return createSleepHandlers({
    sessions: createSessionRepository(prisma), actorId: config.adminEmail,
    sleep: {
      list: (householdId, childId, includeDeleted) => listSleepForChild(prisma, householdId, childId, includeDeleted),
      find: (householdId, childId, sessionId, includeDeleted) => findSleepForChild(prisma, householdId, childId, sessionId, includeDeleted),
      create: (householdId, childId, values, actorId) => createSleepWithAudit(prisma, { householdId, childId, ...values }, actorId),
      update: (householdId, childId, sessionId, values, actorId) => updateSleepWithAudit(prisma, householdId, childId, sessionId, values, actorId),
      remove: (householdId, childId, sessionId, actorId) => softDeleteSleepWithAudit(prisma, householdId, childId, sessionId, actorId),
      restore: (householdId, childId, sessionId, actorId) => restoreSleepWithAudit(prisma, householdId, childId, sessionId, actorId),
      timeZone: (householdId) => getHouseholdTimeZone(prisma, householdId)
    }
  });
}
