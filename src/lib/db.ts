import { PrismaClient } from "@prisma/client";

const globalDatabase = globalThis as typeof globalThis & {
  growLogPrisma?: PrismaClient;
};

export function getPrisma(): PrismaClient {
  if (!globalDatabase.growLogPrisma) {
    globalDatabase.growLogPrisma = new PrismaClient();
  }
  return globalDatabase.growLogPrisma;
}

