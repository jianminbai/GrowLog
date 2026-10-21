import { getNutritionHandlers } from "@/modules/nutrition/nutrition-runtime";
export const dynamic="force-dynamic";type C={params:Promise<{childId:string;mealId:string}>};
export async function POST(r:Request,c:C){const p=await c.params;return getNutritionHandlers().mealLifecycle(r,p.childId,p.mealId,true);}
