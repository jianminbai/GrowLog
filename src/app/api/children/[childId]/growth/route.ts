import { getGrowthHandlers } from "@/modules/growth/growth-runtime";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ childId: string }> };

export async function GET(request: Request, context: Context) {
  const { childId } = await context.params;
  return getGrowthHandlers().list(request, childId);
}

export async function POST(request: Request, context: Context) {
  const { childId } = await context.params;
  return getGrowthHandlers().create(request, childId);
}
