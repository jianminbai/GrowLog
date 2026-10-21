import { getGrowthHandlers } from "@/modules/growth/growth-runtime";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ childId: string; measurementId: string }> };

export async function GET(request: Request, context: Context) {
  const { childId, measurementId } = await context.params;
  return getGrowthHandlers().get(request, childId, measurementId);
}

export async function PATCH(request: Request, context: Context) {
  const { childId, measurementId } = await context.params;
  return getGrowthHandlers().update(request, childId, measurementId);
}

export async function DELETE(request: Request, context: Context) {
  const { childId, measurementId } = await context.params;
  return getGrowthHandlers().remove(request, childId, measurementId);
}
