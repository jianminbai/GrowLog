import { getExportHandlers } from "@/modules/export/export-runtime";

export const dynamic = "force-dynamic";
export async function GET(request: Request) { return getExportHandlers().csv(request); }
