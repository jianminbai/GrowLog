import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { SESSION_COOKIE_NAME } from "@/modules/auth/auth-handlers";
import { InvalidSessionError, resolveSession } from "@/modules/auth/auth-service";
import { createSessionRepository } from "@/modules/auth/session-repository";
import { getPrisma } from "@/lib/db";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value ?? "";

  try {
    await resolveSession(token, createSessionRepository(getPrisma()));
  } catch (error) {
    if (error instanceof InvalidSessionError) redirect("/login");
    throw error;
  }

  return children;
}

