import { getPrisma } from "@/lib/db";
import { readAuthConfig } from "@/modules/auth/auth-config";
import { createSessionRepository } from "@/modules/auth/session-repository";

import { createChildHandlers } from "./child-handlers";
import {
  createChildWithAudit,
  findChildForHousehold,
  listChildrenForHousehold,
  updateChildWithAudit
} from "./child-repository";

export function getChildHandlers() {
  const prisma = getPrisma();
  const config = readAuthConfig();
  return createChildHandlers({
    sessions: createSessionRepository(prisma),
    actorId: config.adminEmail,
    children: {
      list: (householdId) => listChildrenForHousehold(prisma, householdId),
      find: (householdId, childId) => findChildForHousehold(prisma, householdId, childId),
      create: (householdId, values, actorId) =>
        createChildWithAudit(prisma, { householdId, ...values }, actorId),
      update: (householdId, childId, values, actorId) =>
        updateChildWithAudit(prisma, householdId, childId, values, actorId)
    }
  });
}
