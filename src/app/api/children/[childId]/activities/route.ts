import { getActivityHandlers } from "@/modules/activity/activity-runtime";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ childId: string }> };

export async function GET(request: Request, context: Context) {
  return getActivityHandlers().list(request, (await context.params).childId);
}

export async function POST(request: Request, context: Context) {
  return getActivityHandlers().create(request, (await context.params).childId);
}
