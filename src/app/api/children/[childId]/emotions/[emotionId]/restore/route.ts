import { getEmotionHandlers } from "@/modules/emotion/emotion-runtime";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ childId: string; emotionId: string }> };

export async function POST(request: Request, context: Context) {
  const values = await context.params;
  return getEmotionHandlers().restore(request, values.childId, values.emotionId);
}
