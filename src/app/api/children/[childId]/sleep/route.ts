import { getSleepHandlers } from "@/modules/sleep/sleep-runtime";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ childId: string }> };
export async function GET(request: Request, context: Context) { return getSleepHandlers().list(request, (await context.params).childId); }
export async function POST(request: Request, context: Context) { return getSleepHandlers().create(request, (await context.params).childId); }
