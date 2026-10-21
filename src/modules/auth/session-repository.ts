import type { PrismaClient } from "@prisma/client";

import type { SessionRepository } from "./auth-service";

export type SessionPrismaClient = Pick<PrismaClient, "adminSession">;

export function createSessionRepository(client: SessionPrismaClient): SessionRepository {
  return {
    async create(session) {
      await client.adminSession.create({ data: session });
    },
    async findByTokenDigest(tokenDigest) {
      return client.adminSession.findUnique({ where: { tokenDigest } });
    },
    async revokeByTokenDigest(tokenDigest, revokedAt) {
      await client.adminSession.updateMany({
        where: { tokenDigest, revokedAt: null },
        data: { revokedAt }
      });
    }
  };
}

