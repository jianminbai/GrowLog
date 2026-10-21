import { getNutritionHandlers } from "@/modules/nutrition/nutrition-runtime";
export const dynamic="force-dynamic";type C={params:Promise<{childId:string;beverageId:string}>};
export async function PATCH(r:Request,c:C){const p=await c.params;return getNutritionHandlers().updateBeverage(r,p.childId,p.beverageId);}
export async function DELETE(r:Request,c:C){const p=await c.params;return getNutritionHandlers().beverageLifecycle(r,p.childId,p.beverageId,false);}
