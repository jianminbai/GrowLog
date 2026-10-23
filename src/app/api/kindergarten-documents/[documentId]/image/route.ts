import { getKindergartenDocumentHandlers } from "@/modules/kindergarten-documents/document-runtime";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ documentId: string }> };

export async function GET(request: Request, context: Context) {
  return getKindergartenDocumentHandlers().image(request, (await context.params).documentId);
}
