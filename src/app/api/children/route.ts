import { getChildHandlers } from "@/modules/children/child-runtime";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return getChildHandlers().list(request);
}

export async function POST(request: Request) {
  return getChildHandlers().create(request);
}
