import { getSleepHandlers } from "@/modules/sleep/sleep-runtime";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ childId: string; sessionId: string }> };
export async function POST(request: Request, context: Context) { const p = await context.params; return getSleepHandlers().restore(request, p.childId, p.sessionId); }
