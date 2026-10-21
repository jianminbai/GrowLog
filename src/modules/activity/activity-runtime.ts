import { getPrisma } from "@/lib/db";
import { readAuthConfig } from "@/modules/auth/auth-config";
import { createSessionRepository } from "@/modules/auth/session-repository";

import { createActivityHandlers } from "./activity-handlers";
import {
  createActivityWithAudit,
  findActivityForChild,
  getActivityHouseholdTimeZone,
  listActivitiesForChild,
  restoreActivityWithAudit,
  softDeleteActivityWithAudit,
  updateActivityWithAudit
} from "./activity-repository";

export function getActivityHandlers() {
  const prisma = getPrisma();
  const config = readAuthConfig();
  return createActivityHandlers({
    sessions: createSessionRepository(prisma),
    actorId: config.adminEmail,
    activity: {
      list: (householdId, childId, includeDeleted) =>
        listActivitiesForChild(prisma, householdId, childId, includeDeleted),
      find: (householdId, childId, activityId, includeDeleted) =>
        findActivityForChild(prisma, householdId, childId, activityId, includeDeleted),
      create: (householdId, childId, values, actorId) =>
        createActivityWithAudit(prisma, householdId, childId, values, actorId),
      update: (householdId, childId, activityId, values, actorId) =>
        updateActivityWithAudit(prisma, householdId, childId, activityId, values, actorId),
      remove: (householdId, childId, activityId, actorId) =>
        softDeleteActivityWithAudit(prisma, householdId, childId, activityId, actorId),
      restore: (householdId, childId, activityId, actorId) =>
        restoreActivityWithAudit(prisma, householdId, childId, activityId, actorId),
      timeZone: (householdId) => getActivityHouseholdTimeZone(prisma, householdId)
    }
  });
}
