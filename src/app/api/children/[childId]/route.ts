import { getChildHandlers } from "@/modules/children/child-runtime";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ childId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { childId } = await context.params;
  return getChildHandlers().get(request, childId);
}

export async function PATCH(request: Request, context: RouteContext) {
  const { childId } = await context.params;
  return getChildHandlers().update(request, childId);
}
