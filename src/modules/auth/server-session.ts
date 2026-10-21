import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getPrisma } from "@/lib/db";

import { SESSION_COOKIE_NAME } from "./auth-constants";
import { InvalidSessionError, resolveSession } from "./auth-service";
import { createSessionRepository } from "./session-repository";

export async function requireServerSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value ?? "";
  try {
    return await resolveSession(token, createSessionRepository(getPrisma()));
  } catch (error) {
    if (error instanceof InvalidSessionError) redirect("/login");
    throw error;
  }
}
