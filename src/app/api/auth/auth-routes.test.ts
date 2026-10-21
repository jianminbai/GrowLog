import { beforeEach, describe, expect, it } from "vitest";

import {
  CSRF_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  createAuthHandlers,
  type AuthHandlerDependencies
} from "@/modules/auth/auth-handlers";
import type { SessionRecord, SessionRepository } from "@/modules/auth/auth-service";

function makeDependencies(): AuthHandlerDependencies & {
  records: SessionRecord[];
} {
  const records: SessionRecord[] = [];
  const sessions: SessionRepository = {
    async create(session) {
      records.push(session);
    },
    async findByTokenDigest(tokenDigest) {
      return records.find((record) => record.tokenDigest === tokenDigest) ?? null;
    },
    async revokeByTokenDigest(tokenDigest, revokedAt) {
      const record = records.find((item) => item.tokenDigest === tokenDigest);
      if (record) record.revokedAt = revokedAt;
    }
  };

  return {
    records,
    sessions,
    config: {
      adminEmail: "parent@example.com",
      adminPasswordHash: "$argon2id$test",
      householdId: "household-1"
    },
    verifyPassword: async (_hash, password) => password === "correct password"
  };
}

function cookiesFrom(response: Response): string {
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";", 1)[0])
    .join("; ");
}

describe("authentication route handlers", () => {
  let dependencies: ReturnType<typeof makeDependencies>;

  beforeEach(() => {
    dependencies = makeDependencies();
  });

  it("rejects malformed login input with the standard error envelope", async () => {
    const handlers = createAuthHandlers(dependencies);
    const response = await handlers.login(
      new Request("https://growlog.test/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "not-an-email", password: "short" })
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "VALIDATION_ERROR" }
    });
  });

  it("issues secure session and CSRF cookies after a valid login", async () => {
    const handlers = createAuthHandlers(dependencies);
    const response = await handlers.login(
      new Request("https://growlog.test/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "parent@example.com",
          password: "correct password"
        })
      })
    );

    expect(response.status).toBe(200);
    const setCookies = response.headers.getSetCookie();
    expect(setCookies.some((cookie) => cookie.startsWith(`${SESSION_COOKIE_NAME}=`))).toBe(true);
    expect(setCookies.some((cookie) => cookie.startsWith(`${CSRF_COOKIE_NAME}=`))).toBe(true);
    expect(setCookies.join("\n")).toContain("HttpOnly");
    expect(setCookies.join("\n")).toContain("Secure");
    expect(dependencies.records).toHaveLength(1);
  });

  it("rejects anonymous session access", async () => {
    const handlers = createAuthHandlers(dependencies);
    const response = await handlers.session(
      new Request("https://growlog.test/api/auth/session")
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: { code: "UNAUTHORIZED", message: "Authentication required." }
    });
  });

  it("rejects logout without a matching CSRF header and revokes a valid session", async () => {
    const handlers = createAuthHandlers(dependencies);
    const loginResponse = await handlers.login(
      new Request("https://growlog.test/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "parent@example.com",
          password: "correct password"
        })
      })
    );
    const cookieHeader = cookiesFrom(loginResponse);
    const csrf = cookieHeader
      .split("; ")
      .find((cookie) => cookie.startsWith(`${CSRF_COOKIE_NAME}=`))!
      .split("=")[1]!;

    const missingCsrf = await handlers.logout(
      new Request("https://growlog.test/api/auth/logout", {
        method: "POST",
        headers: { cookie: cookieHeader }
      })
    );
    expect(missingCsrf.status).toBe(403);
    expect(dependencies.records[0]?.revokedAt).toBeNull();

    const loggedOut = await handlers.logout(
      new Request("https://growlog.test/api/auth/logout", {
        method: "POST",
        headers: { cookie: cookieHeader, "x-csrf-token": csrf }
      })
    );
    expect(loggedOut.status).toBe(200);
    expect(dependencies.records[0]?.revokedAt).toBeInstanceOf(Date);
    expect(loggedOut.headers.getSetCookie().join("\n")).toContain("Max-Age=0");
  });

  it("uses the externally visible host when validating a same-origin mutation", async () => {
    const handlers = createAuthHandlers(dependencies);
    const loginResponse = await handlers.login(
      new Request("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "parent@example.com",
          password: "correct password"
        })
      })
    );
    const cookieHeader = cookiesFrom(loginResponse);
    const csrf = cookieHeader
      .split("; ")
      .find((cookie) => cookie.startsWith(`${CSRF_COOKIE_NAME}=`))!
      .split("=")[1]!;

    const response = await handlers.logout(
      new Request("http://localhost:3000/api/auth/logout", {
        method: "POST",
        headers: {
          cookie: cookieHeader,
          host: "127.0.0.1:3010",
          origin: "http://127.0.0.1:3010",
          "x-csrf-token": csrf
        }
      })
    );

    expect(response.status).toBe(200);
  });
});
