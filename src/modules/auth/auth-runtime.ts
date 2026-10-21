import { getPrisma } from "@/lib/db";

import { readAuthConfig } from "./auth-config";
import { createAuthHandlers } from "./auth-handlers";
import { createSessionRepository, type SessionPrismaClient } from "./session-repository";

export function getAuthHandlers() {
  return createAuthHandlers({
    config: readAuthConfig(),
    sessions: createSessionRepository(getPrisma() as SessionPrismaClient)
  });
}

