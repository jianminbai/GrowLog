import { describe, expect, it, vi } from "vitest";

import {
  InvalidCredentialsError,
  InvalidSessionError,
  authenticateAdmin,
  issueSession,
  resolveSession,
  revokeSession,
  verifyCsrfToken,
  type SessionRecord,
  type SessionRepository
} from "./auth-service";

function sessionRepository(initial?: SessionRecord): SessionRepository & {
  created: SessionRecord[];
  revokedDigests: string[];
} {
  const created: SessionRecord[] = initial ? [initial] : [];
  const revokedDigests: string[] = [];

  return {
    created,
    revokedDigests,
    async create(session) {
      created.push(session);
    },
    async findByTokenDigest(tokenDigest) {
      return created.find((session) => session.tokenDigest === tokenDigest) ?? null;
    },
    async revokeByTokenDigest(tokenDigest, revokedAt) {
      revokedDigests.push(tokenDigest);
      const session = created.find((item) => item.tokenDigest === tokenDigest);
      if (session) session.revokedAt = revokedAt;
    }
  };
}

const config = {
  adminEmail: "parent@example.com",
  adminPasswordHash: "$argon2id$configured-hash",
  householdId: "household-1"
};

describe("administrator authentication", () => {
  it("accepts the configured administrator with a verified password", async () => {
    const verifyPassword = vi.fn().mockResolvedValue(true);

    await expect(
      authenticateAdmin(
        { email: " Parent@Example.com ", password: "correct horse battery staple" },
        { config, verifyPassword }
      )
    ).resolves.toEqual({ householdId: "household-1" });
    expect(verifyPassword).toHaveBeenCalledWith(
      "$argon2id$configured-hash",
      "correct horse battery staple"
    );
  });

  it.each([
    ["unknown@example.com", true],
    ["parent@example.com", false]
  ])("uses the same public failure for invalid credentials", async (email, passwordMatches) => {
    const verifyPassword = vi.fn().mockResolvedValue(passwordMatches);

    const attempt = authenticateAdmin(
      { email, password: "wrong" },
      { config, verifyPassword }
    );

    await expect(attempt).rejects.toBeInstanceOf(InvalidCredentialsError);
    await expect(attempt).rejects.toMatchObject({ message: "Invalid email or password." });
    expect(verifyPassword).toHaveBeenCalledOnce();
  });
});

describe("administrator sessions", () => {
  it("returns random credentials while persisting only their digests", async () => {
    const sessions = sessionRepository();
    const now = new Date("2026-10-21T02:00:00.000Z");
    const randomValues = [Buffer.alloc(32, 1), Buffer.alloc(32, 2)];

    const issued = await issueSession("household-1", sessions, {
      now,
      randomBytes: () => randomValues.shift() ?? Buffer.alloc(32, 3)
    });

    expect(issued.token).not.toBe(sessions.created[0]?.tokenDigest);
    expect(issued.csrfToken).not.toBe(sessions.created[0]?.csrfTokenDigest);
    expect(sessions.created[0]).toMatchObject({
      householdId: "household-1",
      expiresAt: new Date("2026-11-20T02:00:00.000Z"),
      revokedAt: null
    });
    expect(sessions.created[0]?.tokenDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(sessions.created[0]?.csrfTokenDigest).toMatch(/^[a-f0-9]{64}$/);
  });

  it("resolves an active session and rejects expired or revoked sessions", async () => {
    const now = new Date("2026-10-21T02:00:00.000Z");
    const sessions = sessionRepository();
    const issued = await issueSession("household-1", sessions, { now });

    await expect(resolveSession(issued.token, sessions, now)).resolves.toMatchObject({
      householdId: "household-1"
    });

    const expired = new Date("2026-11-21T02:00:00.000Z");
    await expect(resolveSession(issued.token, sessions, expired)).rejects.toBeInstanceOf(
      InvalidSessionError
    );

    sessions.created[0]!.expiresAt = new Date("2026-12-21T02:00:00.000Z");
    sessions.created[0]!.revokedAt = now;
    await expect(resolveSession(issued.token, sessions, now)).rejects.toBeInstanceOf(
      InvalidSessionError
    );
  });

  it("binds CSRF verification and revocation to the issued session", async () => {
    const sessions = sessionRepository();
    const now = new Date("2026-10-21T02:00:00.000Z");
    const issued = await issueSession("household-1", sessions, { now });

    await expect(
      verifyCsrfToken(issued.token, issued.csrfToken, sessions, now)
    ).resolves.toBeUndefined();
    await expect(
      verifyCsrfToken(issued.token, "different-token", sessions, now)
    ).rejects.toBeInstanceOf(InvalidSessionError);

    await revokeSession(issued.token, sessions, now);
    expect(sessions.revokedDigests).toEqual([sessions.created[0]!.tokenDigest]);
    await expect(resolveSession(issued.token, sessions, now)).rejects.toBeInstanceOf(
      InvalidSessionError
    );
  });
});
