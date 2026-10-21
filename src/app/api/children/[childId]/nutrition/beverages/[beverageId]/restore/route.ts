import { getNutritionHandlers } from "@/modules/nutrition/nutrition-runtime";
export const dynamic="force-dynamic";type C={params:Promise<{childId:string;beverageId:string}>};
export async function POST(r:Request,c:C){const p=await c.params;return getNutritionHandlers().beverageLifecycle(r,p.childId,p.beverageId,true);}
