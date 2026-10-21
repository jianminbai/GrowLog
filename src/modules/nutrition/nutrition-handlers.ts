import type { BeverageIntake } from "@prisma/client";
import { z } from "zod";
import { ok, problem } from "@/lib/result";
import type { SessionRepository } from "@/modules/auth/auth-service";
import { RequestAuthError, requireRequestAuth } from "@/modules/auth/request-auth";
import { dateInTimeZone } from "@/modules/sleep/sleep-record";
import { beverageSchema, beverageUpdateSchema, mealSchema, summarizeNutrition, type BeverageValues, type MealValues } from "./nutrition-record";
import type { StoredMeal } from "./nutrition-repository";

export type NutritionOperations = {
  listMeals(householdId:string,childId:string,includeDeleted:boolean):Promise<StoredMeal[]>;
  listBeverages(householdId:string,childId:string,includeDeleted:boolean):Promise<BeverageIntake[]>;
  createMeal(h:string,c:string,v:MealValues,a:string):Promise<StoredMeal|null>;
  updateMeal(h:string,c:string,id:string,v:MealValues,a:string):Promise<StoredMeal|null>;
  removeMeal(h:string,c:string,id:string,a:string):Promise<StoredMeal|null>;
  restoreMeal(h:string,c:string,id:string,a:string):Promise<StoredMeal|null>;
  createBeverage(h:string,c:string,v:BeverageValues,a:string):Promise<BeverageIntake|null>;
  updateBeverage(h:string,c:string,id:string,v:Partial<BeverageValues>,a:string):Promise<BeverageIntake|null>;
  removeBeverage(h:string,c:string,id:string,a:string):Promise<BeverageIntake|null>;
  restoreBeverage(h:string,c:string,id:string,a:string):Promise<BeverageIntake|null>;
  timeZone(householdId:string):Promise<string>;
};
export type NutritionHandlerDependencies={sessions:SessionRepository;actorId:string;nutrition:NutritionOperations};
const dec=(v:{toString():string}|null)=>v===null?null:Number(v.toString());
export const serializeMeal=(m:StoredMeal)=>({id:m.id,type:m.type,occurredAt:m.occurredAt.toISOString(),appetite:m.appetite,notes:m.notes,source:m.source,deletedAt:m.deletedAt?.toISOString()??null,items:m.items.map(i=>({id:i.id,name:i.name,category:i.category,offeredAmount:dec(i.offeredAmount),consumedAmount:dec(i.consumedAmount),estimatedAmount:dec(i.estimatedAmount),amountUnit:i.amountUnit,isNewFood:i.isNewFood,reactionNote:i.reactionNote}))});
export const serializeBeverage=(b:BeverageIntake)=>({id:b.id,type:b.type,volumeMl:b.volumeMl,occurredAt:b.occurredAt.toISOString(),notes:b.notes,source:b.source,deletedAt:b.deletedAt?.toISOString()??null});
const json=(body:unknown,status=200)=>Response.json(body,{status});
const fail=(code:string,message:string,status:number,fields?:Record<string,string[]>)=>json({error:problem(code,message,status,fields).error},status);
const authFail=(e:unknown)=>e instanceof RequestAuthError?fail(e.code,e.message,e.status):null;
const invalid=(e:z.ZodError)=>fail("VALIDATION_ERROR","Please check the submitted fields.",400,z.flattenError(e).fieldErrors);
const missing=()=>fail("NOT_FOUND","Nutrition record not found.",404);
async function body(r:Request){try{return await r.json();}catch{return undefined;}}

export function createNutritionHandlers(d:NutritionHandlerDependencies){return{
  async list(r:Request,childId:string){try{const a=await requireRequestAuth(r,d.sessions);const u=new URL(r.url);const inc=u.searchParams.get("includeDeleted")==="true";const [meals,beverages,tz]=await Promise.all([d.nutrition.listMeals(a.householdId,childId,inc),d.nutrition.listBeverages(a.householdId,childId,inc),d.nutrition.timeZone(a.householdId)]);const date=/^\d{4}-\d{2}-\d{2}$/.test(u.searchParams.get("date")??"")?u.searchParams.get("date")!:dateInTimeZone(new Date(),tz);return json(ok({meals:meals.map(serializeMeal),beverages:beverages.map(serializeBeverage),summary:summarizeNutrition(meals.filter(m=>!m.deletedAt).map(m=>({occurredAt:m.occurredAt,itemCount:m.items.filter(i=>!i.deletedAt).length})),beverages.filter(b=>!b.deletedAt).map(b=>({occurredAt:b.occurredAt,type:b.type,volumeMl:b.volumeMl})),tz,date),timeZone:tz,date}));}catch(e){const x=authFail(e);if(x)return x;throw e;}},
  async createMeal(r:Request,c:string){try{const a=await requireRequestAuth(r,d.sessions,{mutation:true});const p=mealSchema.safeParse(await body(r));if(!p.success)return invalid(p.error);const v=await d.nutrition.createMeal(a.householdId,c,p.data,d.actorId);return v?json(ok({meal:serializeMeal(v)}),201):missing();}catch(e){const x=authFail(e);if(x)return x;throw e;}},
  async updateMeal(r:Request,c:string,id:string){try{const a=await requireRequestAuth(r,d.sessions,{mutation:true});const p=mealSchema.safeParse(await body(r));if(!p.success)return invalid(p.error);const v=await d.nutrition.updateMeal(a.householdId,c,id,p.data,d.actorId);return v?json(ok({meal:serializeMeal(v)})):missing();}catch(e){const x=authFail(e);if(x)return x;throw e;}},
  async mealLifecycle(r:Request,c:string,id:string,restore:boolean){try{const a=await requireRequestAuth(r,d.sessions,{mutation:true});const v=await (restore?d.nutrition.restoreMeal:d.nutrition.removeMeal)(a.householdId,c,id,d.actorId);return v?json(ok({meal:serializeMeal(v)})):missing();}catch(e){const x=authFail(e);if(x)return x;throw e;}},
  async createBeverage(r:Request,c:string){try{const a=await requireRequestAuth(r,d.sessions,{mutation:true});const p=beverageSchema.safeParse(await body(r));if(!p.success)return invalid(p.error);const v=await d.nutrition.createBeverage(a.householdId,c,p.data,d.actorId);return v?json(ok({beverage:serializeBeverage(v)}),201):missing();}catch(e){const x=authFail(e);if(x)return x;throw e;}},
  async updateBeverage(r:Request,c:string,id:string){try{const a=await requireRequestAuth(r,d.sessions,{mutation:true});const p=beverageUpdateSchema.safeParse(await body(r));if(!p.success)return invalid(p.error);const v=await d.nutrition.updateBeverage(a.householdId,c,id,p.data,d.actorId);return v?json(ok({beverage:serializeBeverage(v)})):missing();}catch(e){const x=authFail(e);if(x)return x;throw e;}},
  async beverageLifecycle(r:Request,c:string,id:string,restore:boolean){try{const a=await requireRequestAuth(r,d.sessions,{mutation:true});const v=await (restore?d.nutrition.restoreBeverage:d.nutrition.removeBeverage)(a.householdId,c,id,d.actorId);return v?json(ok({beverage:serializeBeverage(v)})):missing();}catch(e){const x=authFail(e);if(x)return x;throw e;}}
};}
