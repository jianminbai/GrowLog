import { z } from "zod";

import { ok, problem, type Failure } from "@/lib/result";

import { CSRF_COOKIE_NAME, SESSION_COOKIE_NAME } from "./auth-constants";
import {
  InvalidCredentialsError,
  InvalidSessionError,
  authenticateAdmin,
  issueSession,
  resolveSession,
  revokeSession,
  verifyCsrfToken,
  type AuthConfig,
  type SessionRepository
} from "./auth-service";

export { CSRF_COOKIE_NAME, SESSION_COOKIE_NAME } from "./auth-constants";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(256)
});

export type AuthHandlerDependencies = {
  config: AuthConfig;
  sessions: SessionRepository;
  verifyPassword?: (hash: string, password: string) => Promise<boolean>;
};

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

function jsonProblem(failure: Failure): Response {
  return json({ error: failure.error }, failure.status);
}

function readCookies(request: Request): Map<string, string> {
  const values = new Map<string, string>();
  for (const part of (request.headers.get("cookie") ?? "").split(";")) {
    const separator = part.indexOf("=");
    if (separator < 1) continue;
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    values.set(name, value);
  }
  return values;
}

function sessionCookie(name: string, value: string, expiresAt: Date, httpOnly: boolean): string {
  return [
    `${name}=${value}`,
    "Path=/",
    "Secure",
    httpOnly ? "HttpOnly" : null,
    "SameSite=Lax",
    `Expires=${expiresAt.toUTCString()}`
  ]
    .filter(Boolean)
    .join("; ");
}

function expiredCookie(name: string, httpOnly: boolean): string {
  return [
    `${name}=`,
    "Path=/",
    "Secure",
    httpOnly ? "HttpOnly" : null,
    "SameSite=Lax",
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT"
  ]
    .filter(Boolean)
    .join("; ");
}

function hasValidOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (origin === null) return true;

  const requestUrl = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",", 1)[0]?.trim();
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",", 1)[0]?.trim();
  const host = forwardedHost || request.headers.get("host") || requestUrl.host;
  const protocol = forwardedProtocol || requestUrl.protocol.slice(0, -1);

  try {
    return new URL(origin).origin === new URL(`${protocol}://${host}`).origin;
  } catch {
    return false;
  }
}

export function createAuthHandlers(dependencies: AuthHandlerDependencies) {
  return {
    async login(request: Request): Promise<Response> {
      let payload: unknown;
      try {
        payload = await request.json();
      } catch {
        return jsonProblem(problem("VALIDATION_ERROR", "Please check the submitted fields.", 400));
      }

      const parsed = loginSchema.safeParse(payload);
      if (!parsed.success) {
        return jsonProblem(
          problem(
            "VALIDATION_ERROR",
            "Please check the submitted fields.",
            400,
            z.flattenError(parsed.error).fieldErrors
          )
        );
      }

      try {
        const authenticated = await authenticateAdmin(parsed.data, dependencies);
        const issued = await issueSession(authenticated.householdId, dependencies.sessions);
        const response = json(ok({ authenticated: true, csrfToken: issued.csrfToken }));
        response.headers.append(
          "set-cookie",
          sessionCookie(SESSION_COOKIE_NAME, issued.token, issued.expiresAt, true)
        );
        response.headers.append(
          "set-cookie",
          sessionCookie(CSRF_COOKIE_NAME, issued.csrfToken, issued.expiresAt, false)
        );
        return response;
      } catch (error) {
        if (error instanceof InvalidCredentialsError) {
          return jsonProblem(problem("INVALID_CREDENTIALS", error.message, 401));
        }
        throw error;
      }
    },

    async session(request: Request): Promise<Response> {
      const token = readCookies(request).get(SESSION_COOKIE_NAME) ?? "";
      try {
        const session = await resolveSession(token, dependencies.sessions);
        return json(ok({ authenticated: true, householdId: session.householdId }));
      } catch (error) {
        if (error instanceof InvalidSessionError) {
          return jsonProblem(problem("UNAUTHORIZED", "Authentication required.", 401));
        }
        throw error;
      }
    },

    async logout(request: Request): Promise<Response> {
      const cookies = readCookies(request);
      const token = cookies.get(SESSION_COOKIE_NAME) ?? "";
      const submittedCsrf = request.headers.get("x-csrf-token") ?? "";

      if (!hasValidOrigin(request)) {
        return jsonProblem(problem("FORBIDDEN", "Request origin is not allowed.", 403));
      }

      try {
        await verifyCsrfToken(token, submittedCsrf, dependencies.sessions);
        await revokeSession(token, dependencies.sessions);
      } catch (error) {
        if (error instanceof InvalidSessionError) {
          return jsonProblem(problem("FORBIDDEN", "A valid CSRF token is required.", 403));
        }
        throw error;
      }

      const response = json(ok({ authenticated: false }));
      response.headers.append("set-cookie", expiredCookie(SESSION_COOKIE_NAME, true));
      response.headers.append("set-cookie", expiredCookie(CSRF_COOKIE_NAME, false));
      return response;
    }
  };
}
