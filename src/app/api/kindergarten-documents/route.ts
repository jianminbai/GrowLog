import { getKindergartenDocumentHandlers } from "@/modules/kindergarten-documents/document-runtime";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return getKindergartenDocumentHandlers().list(request);
}

export async function POST(request: Request) {
  return getKindergartenDocumentHandlers().upload(request);
}
