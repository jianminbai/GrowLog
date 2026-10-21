import { createHash, randomBytes as nodeRandomBytes, timingSafeEqual } from "node:crypto";

import { verify as verifyArgon2 } from "@node-rs/argon2";

const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1_000;

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid email or password.");
    this.name = "InvalidCredentialsError";
  }
}

export class InvalidSessionError extends Error {
  constructor() {
    super("Your session is invalid or has expired.");
    this.name = "InvalidSessionError";
  }
}

export type AuthConfig = {
  adminEmail: string;
  adminPasswordHash: string;
  householdId: string;
};

export type SessionRecord = {
  householdId: string;
  tokenDigest: string;
  csrfTokenDigest: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
};

export interface SessionRepository {
  create(session: SessionRecord): Promise<void>;
  findByTokenDigest(tokenDigest: string): Promise<SessionRecord | null>;
  revokeByTokenDigest(tokenDigest: string, revokedAt: Date): Promise<void>;
}

type VerifyPassword = (hash: string, password: string) => Promise<boolean>;

type AuthenticationDependencies = {
  config: AuthConfig;
  verifyPassword?: VerifyPassword;
};

type SessionOptions = {
  now?: Date;
  randomBytes?: () => Buffer;
};

function digest(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function sameDigest(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left, "hex");
  const rightBytes = Buffer.from(right, "hex");
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

export async function authenticateAdmin(
  credentials: { email: string; password: string },
  dependencies: AuthenticationDependencies
): Promise<{ householdId: string }> {
  const verifier = dependencies.verifyPassword ?? verifyArgon2;
  const passwordMatches = await verifier(
    dependencies.config.adminPasswordHash,
    credentials.password
  );
  const emailMatches =
    credentials.email.trim().toLocaleLowerCase("en-US") ===
    dependencies.config.adminEmail.trim().toLocaleLowerCase("en-US");

  if (!emailMatches || !passwordMatches) {
    throw new InvalidCredentialsError();
  }

  return { householdId: dependencies.config.householdId };
}

export async function issueSession(
  householdId: string,
  repository: SessionRepository,
  options: SessionOptions = {}
): Promise<{ token: string; csrfToken: string; expiresAt: Date }> {
  const now = options.now ?? new Date();
  const getRandomBytes = options.randomBytes ?? (() => nodeRandomBytes(32));
  const token = getRandomBytes().toString("base64url");
  const csrfToken = getRandomBytes().toString("base64url");
  const expiresAt = new Date(now.getTime() + SESSION_LIFETIME_MS);

  await repository.create({
    householdId,
    tokenDigest: digest(token),
    csrfTokenDigest: digest(csrfToken),
    expiresAt,
    revokedAt: null,
    createdAt: now
  });

  return { token, csrfToken, expiresAt };
}

export async function resolveSession(
  token: string,
  repository: SessionRepository,
  now = new Date()
): Promise<SessionRecord> {
  if (!token) throw new InvalidSessionError();

  const session = await repository.findByTokenDigest(digest(token));
  if (!session || session.revokedAt || session.expiresAt.getTime() <= now.getTime()) {
    throw new InvalidSessionError();
  }

  return session;
}

export async function verifyCsrfToken(
  token: string,
  csrfToken: string,
  repository: SessionRepository,
  now = new Date()
): Promise<void> {
  const session = await resolveSession(token, repository, now);
  const submittedDigest = digest(csrfToken);

  if (!sameDigest(session.csrfTokenDigest, submittedDigest)) {
    throw new InvalidSessionError();
  }
}

export async function revokeSession(
  token: string,
  repository: SessionRepository,
  now = new Date()
): Promise<void> {
  if (!token) return;
  await repository.revokeByTokenDigest(digest(token), now);
}
