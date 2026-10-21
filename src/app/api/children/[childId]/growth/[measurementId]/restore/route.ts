import { getGrowthHandlers } from "@/modules/growth/growth-runtime";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ childId: string; measurementId: string }> };

export async function POST(request: Request, context: Context) {
  const { childId, measurementId } = await context.params;
  return getGrowthHandlers().restore(request, childId, measurementId);
}
