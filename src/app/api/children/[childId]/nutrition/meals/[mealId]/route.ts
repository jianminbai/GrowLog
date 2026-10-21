import { getNutritionHandlers } from "@/modules/nutrition/nutrition-runtime";
export const dynamic="force-dynamic";type C={params:Promise<{childId:string;mealId:string}>};
export async function PATCH(r:Request,c:C){const p=await c.params;return getNutritionHandlers().updateMeal(r,p.childId,p.mealId);}
export async function DELETE(r:Request,c:C){const p=await c.params;return getNutritionHandlers().mealLifecycle(r,p.childId,p.mealId,false);}
