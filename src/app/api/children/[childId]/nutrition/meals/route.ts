import { getNutritionHandlers } from "@/modules/nutrition/nutrition-runtime";
export const dynamic="force-dynamic";type C={params:Promise<{childId:string}>};
export async function POST(r:Request,c:C){return getNutritionHandlers().createMeal(r,(await c.params).childId);}
