import type { SessionRecord, SessionRepository } from "./auth-service";

type StoredSession = SessionRecord & { id: string };

export type SessionPrismaClient = {
  adminSession: {
    create(args: { data: SessionRecord }): Promise<StoredSession>;
    findUnique(args: { where: { tokenDigest: string } }): Promise<StoredSession | null>;
    updateMany(args: {
      where: { tokenDigest: string; revokedAt: null };
      data: { revokedAt: Date };
    }): Promise<{ count: number }>;
  };
};

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

