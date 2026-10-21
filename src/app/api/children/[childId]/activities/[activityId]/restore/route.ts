import { getActivityHandlers } from "@/modules/activity/activity-runtime";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ childId: string; activityId: string }> };

export async function POST(request: Request, context: Context) {
  const values = await context.params;
  return getActivityHandlers().restore(request, values.childId, values.activityId);
}
