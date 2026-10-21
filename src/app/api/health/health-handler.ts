import { NextResponse } from "next/server";

import { ok, problem } from "@/lib/result";

export function createHealthHandler(probe: () => Promise<unknown>) {
  return async function health() {
    try {
      await probe();
      return NextResponse.json(ok({ status: "ok" as const, database: "ok" as const }));
    } catch {
      const failure = problem("SERVICE_UNAVAILABLE", "Database is unavailable.", 503);
      return NextResponse.json({ error: failure.error }, { status: failure.status });
    }
  };
}
