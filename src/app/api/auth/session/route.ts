import { getAuthHandlers } from "@/modules/auth/auth-runtime";

export async function GET(request: Request) {
  return getAuthHandlers().session(request);
}

