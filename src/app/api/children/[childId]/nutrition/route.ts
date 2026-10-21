import { getNutritionHandlers } from "@/modules/nutrition/nutrition-runtime";
export const dynamic="force-dynamic";type C={params:Promise<{childId:string}>};
export async function GET(r:Request,c:C){return getNutritionHandlers().list(r,(await c.params).childId);}
