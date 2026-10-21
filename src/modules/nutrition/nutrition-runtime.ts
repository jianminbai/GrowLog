import { getPrisma } from "@/lib/db";
import { readAuthConfig } from "@/modules/auth/auth-config";
import { createSessionRepository } from "@/modules/auth/session-repository";
import { getHouseholdTimeZone } from "@/modules/sleep/sleep-repository";
import { createNutritionHandlers } from "./nutrition-handlers";
import * as repo from "./nutrition-repository";
export function getNutritionHandlers(){const p=getPrisma(),c=readAuthConfig();return createNutritionHandlers({sessions:createSessionRepository(p),actorId:c.adminEmail,nutrition:{
  listMeals:(h,ch,i)=>repo.listMealsForChild(p,h,ch,i),listBeverages:(h,ch,i)=>repo.listBeveragesForChild(p,h,ch,i),
  createMeal:(h,ch,v,a)=>repo.createMealWithAudit(p,h,ch,v,a),updateMeal:(h,ch,id,v,a)=>repo.updateMealWithAudit(p,h,ch,id,v,a),removeMeal:(h,ch,id,a)=>repo.softDeleteMealWithAudit(p,h,ch,id,a),restoreMeal:(h,ch,id,a)=>repo.restoreMealWithAudit(p,h,ch,id,a),
  createBeverage:(h,ch,v,a)=>repo.createBeverageWithAudit(p,h,ch,v,a),updateBeverage:(h,ch,id,v,a)=>repo.updateBeverageWithAudit(p,h,ch,id,v,a),removeBeverage:(h,ch,id,a)=>repo.softDeleteBeverageWithAudit(p,h,ch,id,a),restoreBeverage:(h,ch,id,a)=>repo.restoreBeverageWithAudit(p,h,ch,id,a),timeZone:(h)=>getHouseholdTimeZone(p,h)
}});}
