import { getPrisma } from "@/lib/db";
import { createHealthHandler } from "./health-handler";

export const GET = createHealthHandler(() => getPrisma().$queryRaw`SELECT 1`);
