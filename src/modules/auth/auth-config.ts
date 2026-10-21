import { z } from "zod";

import type { AuthConfig } from "./auth-service";

const environmentSchema = z.object({
  ADMIN_EMAIL: z.email(),
  ADMIN_PASSWORD_HASH: z.string().startsWith("$argon2id$").min(32),
  HOUSEHOLD_ID: z.string().min(1)
});

export function readAuthConfig(environment: NodeJS.ProcessEnv = process.env): AuthConfig {
  const values = environmentSchema.parse(environment);
  return {
    adminEmail: values.ADMIN_EMAIL,
    adminPasswordHash: values.ADMIN_PASSWORD_HASH,
    householdId: values.HOUSEHOLD_ID
  };
}

