import { getPrisma } from "@/lib/db";
import { readAuthConfig } from "@/modules/auth/auth-config";
import { createSessionRepository } from "@/modules/auth/session-repository";

import { createEmotionHandlers } from "./emotion-handlers";
import {
  createEmotionWithAudit,
  getEmotionHouseholdTimeZone,
  listEmotionsForChild,
  restoreEmotionWithAudit,
  softDeleteEmotionWithAudit,
  updateEmotionWithAudit
} from "./emotion-repository";

export function getEmotionHandlers() {
  const prisma = getPrisma();
  const config = readAuthConfig();
  return createEmotionHandlers({
    sessions: createSessionRepository(prisma),
    actorId: config.adminEmail,
    emotion: {
      list: (householdId, childId, includeDeleted) =>
        listEmotionsForChild(prisma, householdId, childId, includeDeleted),
      create: (householdId, childId, values, actorId) =>
        createEmotionWithAudit(prisma, householdId, childId, values, actorId),
      update: (householdId, childId, emotionId, values, actorId) =>
        updateEmotionWithAudit(prisma, householdId, childId, emotionId, values, actorId),
      remove: (householdId, childId, emotionId, actorId) =>
        softDeleteEmotionWithAudit(prisma, householdId, childId, emotionId, actorId),
      restore: (householdId, childId, emotionId, actorId) =>
        restoreEmotionWithAudit(prisma, householdId, childId, emotionId, actorId),
      timeZone: (householdId) => getEmotionHouseholdTimeZone(prisma, householdId)
    }
  });
}
