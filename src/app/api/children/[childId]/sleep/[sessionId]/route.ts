import { getSleepHandlers } from "@/modules/sleep/sleep-runtime";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ childId: string; sessionId: string }> };
export async function PATCH(request: Request, context: Context) { const p = await context.params; return getSleepHandlers().update(request, p.childId, p.sessionId); }
export async function DELETE(request: Request, context: Context) { const p = await context.params; return getSleepHandlers().remove(request, p.childId, p.sessionId); }
