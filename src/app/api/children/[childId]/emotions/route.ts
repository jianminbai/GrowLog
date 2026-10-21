import { getEmotionHandlers } from "@/modules/emotion/emotion-runtime";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ childId: string }> };

export async function GET(request: Request, context: Context) {
  return getEmotionHandlers().list(request, (await context.params).childId);
}

export async function POST(request: Request, context: Context) {
  return getEmotionHandlers().create(request, (await context.params).childId);
}
