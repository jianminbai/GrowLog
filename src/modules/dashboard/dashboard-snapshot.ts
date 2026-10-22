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

export type DashboardInput = {
  date: string;
  timeZone: string;
  sleep: SleepRecord[];
  meals: MealRecord[];
  beverages: BeverageRecord[];
  activities: ActivityRecord[];
  emotions: EmotionRecord[];
};

export function buildDashboardSnapshot(input: DashboardInput) {
  const todaySleep = input.sleep.filter((record) => dateInTimeZone(record.endedAt, input.timeZone) === input.date);
  const todayMeals = input.meals.filter((record) => dateInTimeZone(record.occurredAt, input.timeZone) === input.date);
  const todayBeverages = input.beverages.filter((record) => dateInTimeZone(record.occurredAt, input.timeZone) === input.date);
  const todayActivities = input.activities.filter((record) => dateInTimeZone(record.occurredAt, input.timeZone) === input.date);
  const todayEmotions = input.emotions.filter((record) => dateInTimeZone(record.occurredAt, input.timeZone) === input.date)
    .sort((left, right) => left.occurredAt.getTime() - right.occurredAt.getTime());

  const optionalTotal = (values: Array<number | null>) => {
    const knownValues = values.filter((value): value is number => value !== null);
    return knownValues.length > 0 ? knownValues.reduce((total, value) => total + value, 0) : null;
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
      meals: todayMeals.length,
      foodItems: todayMeals.reduce((total, meal) =>
        total + meal.items.filter((item) => !item.deletedAt).length, 0),
      milkMl: volume("MILK"),
      waterMl: volume("WATER"),
      unknownBeverages: todayBeverages.filter((record) => record.volumeMl === null).length,
      activityMinutes: todayActivities.reduce((total, record) => total + record.durationMinutes, 0),
      outdoorMinutes: optionalTotal(todayActivities.map((record) => record.outdoorMinutes)),
      unknownOutdoorActivities: todayActivities.filter((record) => record.outdoorMinutes === null).length,
      mood: todayEmotions.at(-1)?.mood ?? null
    }
  };
}
