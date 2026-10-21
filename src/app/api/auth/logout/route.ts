import { getAuthHandlers } from "@/modules/auth/auth-runtime";

export async function POST(request: Request) {
  return getAuthHandlers().logout(request);
}

