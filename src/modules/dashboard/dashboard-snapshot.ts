import { calculateSleepMinutes, dateInTimeZone } from "@/modules/sleep/sleep-record";

type SleepRecord = {
  kind: "NIGHT" | "NAP";
  startedAt: Date;
  endedAt: Date;
  awakeMinutes: number | null;
};
type MealRecord = { occurredAt: Date; items: Array<{ deletedAt: Date | null }> };
type BeverageRecord = {
  occurredAt: Date;
  type: "MILK" | "WATER" | "YOGURT_DRINK" | "OTHER";
  volumeMl: number | null;
};
type ActivityRecord = {
  occurredAt: Date;
  durationMinutes: number;
  outdoorMinutes: number | null;
  intensity: "LIGHT" | "MODERATE" | "VIGOROUS";
};
type EmotionRecord = {
  occurredAt: Date;
  mood: "HAPPY" | "CALM" | "ANXIOUS" | "SAD" | "ANGRY" | "MIXED" | "OTHER";
  tags: string[];
};
type Average = { value: number; days: number };

function offsetDate(date: string, days: number) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function addTotal(totals: Map<string, number>, date: string, value: number) {
  totals.set(date, (totals.get(date) ?? 0) + value);
}

function addOptionalTotal(totals: Map<string, number | null>, date: string, value: number | null) {
  const previous = totals.get(date);
  totals.set(date, value === null || previous === null ? null : (previous ?? 0) + value);
}

function recordedDayAverage(totals: Map<string, number | null>): Average | null {
  const known = [...totals.values()].filter((value): value is number => value !== null);
  if (known.length === 0) return null;
  return { value: Number((known.reduce((sum, value) => sum + value, 0) / known.length).toFixed(1)), days: known.length };
}

export type DashboardInput = {
  date: string;
  timeZone: string;
  sleep: SleepRecord[];
  meals: MealRecord[];
  beverages: BeverageRecord[];
  activities: ActivityRecord[];
  emotions: EmotionRecord[];
};

function buildComparison(input: DashboardInput, days: number) {
  const startDate = offsetDate(input.date, -days);
  const endDate = offsetDate(input.date, -1);
  const comparisonDate = (at: Date) => {
    const date = dateInTimeZone(at, input.timeZone);
    return date >= startDate && date <= endDate ? date : null;
  };
  const sleepTotals = new Map<string, number>();
  const mealTotals = new Map<string, number>();
  const foodItemTotals = new Map<string, number>();
  const milkTotals = new Map<string, number | null>();
  const waterTotals = new Map<string, number | null>();
  const activityTotals = new Map<string, number>();
  const outdoorTotals = new Map<string, number | null>();
  const moodCounts = new Map<EmotionRecord["mood"], number>();
  let moodTotal = 0;

  for (const record of input.sleep) {
    const date = comparisonDate(record.endedAt);
    if (date) addTotal(sleepTotals, date, calculateSleepMinutes(record.startedAt, record.endedAt, record.awakeMinutes));
  }
  for (const record of input.meals) {
    const date = comparisonDate(record.occurredAt);
    if (!date) continue;
    addTotal(mealTotals, date, 1);
    addTotal(foodItemTotals, date, record.items.filter((item) => !item.deletedAt).length);
  }
  for (const record of input.beverages) {
    const date = comparisonDate(record.occurredAt);
    if (!date) continue;
    if (record.type === "MILK") addOptionalTotal(milkTotals, date, record.volumeMl);
    if (record.type === "WATER") addOptionalTotal(waterTotals, date, record.volumeMl);
  }
  for (const record of input.activities) {
    const date = comparisonDate(record.occurredAt);
    if (!date) continue;
    addTotal(activityTotals, date, record.durationMinutes);
    addOptionalTotal(outdoorTotals, date, record.outdoorMinutes);
  }
  for (const record of input.emotions) {
    if (!comparisonDate(record.occurredAt)) continue;
    moodCounts.set(record.mood, (moodCounts.get(record.mood) ?? 0) + 1);
    moodTotal += 1;
  }
  const commonMood = [...moodCounts.entries()].sort((left, right) => right[1] - left[1])[0] ?? null;

  return {
    startDate,
    endDate,
    sleepMinutes: recordedDayAverage(sleepTotals),
    meals: recordedDayAverage(mealTotals),
    foodItems: recordedDayAverage(foodItemTotals),
    milkMl: recordedDayAverage(milkTotals),
    waterMl: recordedDayAverage(waterTotals),
    activityMinutes: recordedDayAverage(activityTotals),
    outdoorMinutes: recordedDayAverage(outdoorTotals),
    mood: commonMood ? { mood: commonMood[0], count: commonMood[1], total: moodTotal } : null
  };
}

export function buildDashboardSnapshot(input: DashboardInput) {
  const todaySleep = input.sleep.filter((record) => dateInTimeZone(record.endedAt, input.timeZone) === input.date);
  const todayMeals = input.meals.filter((record) => dateInTimeZone(record.occurredAt, input.timeZone) === input.date);
  const todayBeverages = input.beverages.filter((record) => dateInTimeZone(record.occurredAt, input.timeZone) === input.date);
  const todayActivities = input.activities.filter((record) => dateInTimeZone(record.occurredAt, input.timeZone) === input.date);
  const todayEmotions = input.emotions.filter((record) => dateInTimeZone(record.occurredAt, input.timeZone) === input.date)
    .sort((left, right) => left.occurredAt.getTime() - right.occurredAt.getTime());

  const optionalTotal = (values: Array<number | null>) => {
    const knownValues = values.filter((value): value is number => value !== null);
    if (values.length === 0 || knownValues.length !== values.length) return null;
    return knownValues.reduce((total, value) => total + value, 0);
  };
  const volume = (type: "MILK" | "WATER") => optionalTotal(todayBeverages
    .filter((record) => record.type === type)
    .map((record) => record.volumeMl));
  const hasDailyNutrition = todayMeals.length > 0 || todayBeverages.length > 0;

  return {
    completion: {
      sleep: todaySleep.length > 0,
      nutrition: hasDailyNutrition,
      activity: todayActivities.length > 0,
      emotion: todayEmotions.length > 0
    },
    today: {
      sleepMinutes: todaySleep.length > 0
        ? todaySleep.reduce((total, record) => total + calculateSleepMinutes(record.startedAt, record.endedAt, record.awakeMinutes), 0)
        : null,
      meals: todayMeals.length > 0 ? todayMeals.length : null,
      foodItems: todayMeals.length > 0
        ? todayMeals.reduce((total, meal) =>
            total + meal.items.filter((item) => !item.deletedAt).length, 0)
        : null,
      milkMl: volume("MILK"),
      waterMl: volume("WATER"),
      unknownBeverages: todayBeverages.filter((record) => record.volumeMl === null).length,
      activityMinutes: todayActivities.reduce((total, record) => total + record.durationMinutes, 0),
      outdoorMinutes: optionalTotal(todayActivities.map((record) => record.outdoorMinutes)),
      unknownOutdoorActivities: todayActivities.filter((record) => record.outdoorMinutes === null).length,
      mood: todayEmotions.at(-1)?.mood ?? null
    },
    comparison: {
      sevenDays: buildComparison(input, 7),
      twoWeeks: buildComparison(input, 14),
      oneMonth: buildComparison(input, 30)
    }
  };
}
