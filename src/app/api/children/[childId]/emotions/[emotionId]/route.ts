import { getEmotionHandlers } from "@/modules/emotion/emotion-runtime";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ childId: string; emotionId: string }> };

export async function PATCH(request: Request, context: Context) {
  const values = await context.params;
  return getEmotionHandlers().update(request, values.childId, values.emotionId);
}

export async function DELETE(request: Request, context: Context) {
  const values = await context.params;
  return getEmotionHandlers().remove(request, values.childId, values.emotionId);
}
