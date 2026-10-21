import {
  InvalidSessionError,
  resolveSession,
  verifyCsrfToken,
  type SessionRecord,
  type SessionRepository
} from "./auth-service";
import { SESSION_COOKIE_NAME } from "./auth-constants";

export class RequestAuthError extends Error {
  constructor(
    readonly code: "UNAUTHORIZED" | "FORBIDDEN",
    readonly status: 401 | 403,
    message: string
  ) {
    super(message);
    this.name = "RequestAuthError";
  }
}

export function readRequestCookies(request: Request): Map<string, string> {
  const values = new Map<string, string>();
  for (const part of (request.headers.get("cookie") ?? "").split(";")) {
    const separator = part.indexOf("=");
    if (separator < 1) continue;
    values.set(part.slice(0, separator).trim(), part.slice(separator + 1).trim());
  }
  return values;
}

export function hasValidRequestOrigin(request: Request): boolean {
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

export async function requireRequestAuth(
  request: Request,
  repository: SessionRepository,
  options: { mutation?: boolean } = {}
): Promise<SessionRecord> {
  const cookies = readRequestCookies(request);
  const token = cookies.get(SESSION_COOKIE_NAME) ?? "";

  try {
    if (options.mutation) {
      if (!hasValidRequestOrigin(request)) {
        throw new RequestAuthError("FORBIDDEN", 403, "Request origin is not allowed.");
      }
      await verifyCsrfToken(token, request.headers.get("x-csrf-token") ?? "", repository);
    }
    return await resolveSession(token, repository);
  } catch (error) {
    if (error instanceof RequestAuthError) throw error;
    if (error instanceof InvalidSessionError) {
      if (options.mutation) {
        throw new RequestAuthError("FORBIDDEN", 403, "A valid CSRF token is required.");
      }
      throw new RequestAuthError("UNAUTHORIZED", 401, "Authentication required.");
    }
    throw error;
  }
}
