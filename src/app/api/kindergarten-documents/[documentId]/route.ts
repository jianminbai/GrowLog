import { getKindergartenDocumentHandlers } from "@/modules/kindergarten-documents/document-runtime";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ documentId: string }> };

export async function DELETE(request: Request, context: Context) {
  return getKindergartenDocumentHandlers().remove(request, (await context.params).documentId);
}
