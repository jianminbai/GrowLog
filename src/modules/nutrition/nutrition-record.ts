import { z } from "zod";
import { dateInTimeZone } from "@/modules/sleep/sleep-record";

const instant = z.iso.datetime().transform((value) => new Date(value));
const text = (max: number) => z.union([z.string().trim().max(max), z.null()]).transform((value) => value === "" ? null : value).optional();
const amount = z.number().finite().min(0).max(100_000).nullable().optional();

export const mealItemSchema = z.object({
  name: z.string().trim().min(1).max(120), category: text(80),
  offeredAmount: amount, consumedAmount: amount, estimatedAmount: amount,
  amountUnit: text(24), isNewFood: z.boolean().default(false), reactionNote: text(500)
}).strict().superRefine((value, context) => {
  const hasAmount = [value.offeredAmount, value.consumedAmount, value.estimatedAmount]
    .some((item) => item !== null && item !== undefined);
  if (hasAmount && !value.amountUnit) context.addIssue({ code: "custom", path: ["amountUnit"], message: "Unit is required when an amount is recorded." });
});

export const mealSchema = z.object({
  type: z.enum(["BREAKFAST", "MORNING_SNACK", "LUNCH", "AFTERNOON_SNACK", "DINNER", "OTHER"]),
  occurredAt: instant, appetite: text(80), notes: text(2000),
  source: z.enum(["MANUAL", "HOME", "HOSPITAL", "KINDERGARTEN", "IMPORT"]),
  items: z.array(mealItemSchema).min(1).max(50)
}).strict();

export const beverageSchema = z.object({
  type: z.enum(["MILK", "WATER", "YOGURT_DRINK", "OTHER"]),
  volumeMl: z.number().int().positive().max(5000).nullable().optional(),
  occurredAt: instant, notes: text(2000),
  source: z.enum(["MANUAL", "HOME", "HOSPITAL", "KINDERGARTEN", "IMPORT"])
}).strict();
export const beverageUpdateSchema = beverageSchema.partial().refine((value) => Object.keys(value).length > 0, { message: "Submit at least one field." });

export type MealValues = z.output<typeof mealSchema>;
export type BeverageValues = z.output<typeof beverageSchema>;

export function summarizeNutrition(
  meals: Array<{ occurredAt: Date; itemCount: number }>,
  beverages: Array<{ occurredAt: Date; type: "MILK" | "WATER" | "YOGURT_DRINK" | "OTHER"; volumeMl: number | null }>,
  timeZone: string,
  date: string
) {
  const dailyMeals = meals.filter((meal) => dateInTimeZone(meal.occurredAt, timeZone) === date);
  const dailyBeverages = beverages.filter((item) => dateInTimeZone(item.occurredAt, timeZone) === date);
  return {
    mealCount: dailyMeals.length,
    foodItemCount: dailyMeals.reduce((sum, meal) => sum + meal.itemCount, 0),
    milkMl: dailyBeverages.filter((item) => item.type === "MILK" && item.volumeMl !== null).reduce((sum, item) => sum + item.volumeMl!, 0),
    waterMl: dailyBeverages.filter((item) => item.type === "WATER" && item.volumeMl !== null).reduce((sum, item) => sum + item.volumeMl!, 0),
    unknownBeverageCount: dailyBeverages.filter((item) => item.volumeMl === null).length
  };
}
