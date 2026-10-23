import path from "node:path";

import { getPrisma } from "@/lib/db";
import { readAuthConfig } from "@/modules/auth/auth-config";
import { createSessionRepository } from "@/modules/auth/session-repository";

import { createLocalDocumentFileStore } from "./document-file-store";
import { createKindergartenDocumentHandlers } from "./document-handlers";
import {
  deleteDocumentWithAudit,
  findDocumentForHousehold,
  listDocumentsForChild,
  upsertDocumentWithAudit
} from "./document-repository";

export function getKindergartenDocumentHandlers() {
  const prisma = getPrisma();
  const config = readAuthConfig();
  return createKindergartenDocumentHandlers({
    sessions: createSessionRepository(prisma),
    actorId: config.adminEmail,
    files: createLocalDocumentFileStore(process.env.UPLOAD_DIR ?? path.join(process.cwd(), ".data", "uploads")),
    documents: {
      list: (householdId, childId) => listDocumentsForChild(prisma, householdId, childId),
      find: (householdId, documentId) => findDocumentForHousehold(prisma, householdId, documentId),
      upsert: (householdId, values, actorId) => upsertDocumentWithAudit(prisma, householdId, values, actorId),
      remove: (householdId, documentId, actorId) => deleteDocumentWithAudit(prisma, householdId, documentId, actorId)
    }
  });
}
