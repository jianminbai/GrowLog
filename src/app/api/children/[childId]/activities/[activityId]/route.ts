import { getActivityHandlers } from "@/modules/activity/activity-runtime";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ childId: string; activityId: string }> };

export async function PATCH(request: Request, context: Context) {
  const values = await context.params;
  return getActivityHandlers().update(request, values.childId, values.activityId);
}

export async function DELETE(request: Request, context: Context) {
  const values = await context.params;
  return getActivityHandlers().remove(request, values.childId, values.activityId);
}
