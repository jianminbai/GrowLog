import { NextResponse } from "next/server";

import { ok } from "@/lib/result";

export function GET() {
  return NextResponse.json(ok({ status: "ok" as const }));
}
