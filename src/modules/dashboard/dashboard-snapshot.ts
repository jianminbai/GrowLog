import { summarizeActivity } from "@/modules/activity/activity-record";
import { summarizeEmotions } from "@/modules/emotion/emotion-record";
import { calculateSleepMinutes, dateInTimeZone, summarizeSleep } from "@/modules/sleep/sleep-record";

type Numeric = number | { toString(): string };
type GrowthRecord = { measuredAt: Date; heightCm: Numeric | null; weightKg: Numeric | null };
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
  growth: GrowthRecord[];
  sleep: SleepRecord[];
  meals: MealRecord[];
  beverages: BeverageRecord[];
  activities: ActivityRecord[];
  emotions: EmotionRecord[];
};

const numeric = (value: Numeric | null) => value === null ? null : Number(value.toString());

export function buildDashboardSnapshot(input: DashboardInput) {
  const todaySleep = input.sleep.filter((record) => dateInTimeZone(record.endedAt, input.timeZone) === input.date);
  const todayMeals = input.meals.filter((record) => dateInTimeZone(record.occurredAt, input.timeZone) === input.date);
  const todayBeverages = input.beverages.filter((record) => dateInTimeZone(record.occurredAt, input.timeZone) === input.date);
  const todayActivities = input.activities.filter((record) => dateInTimeZone(record.occurredAt, input.timeZone) === input.date);
  const todayEmotions = input.emotions.filter((record) => dateInTimeZone(record.occurredAt, input.timeZone) === input.date)
    .sort((left, right) => left.occurredAt.getTime() - right.occurredAt.getTime());

  const latestGrowthRecord = input.growth.reduce<GrowthRecord | null>((latest, record) =>
    !latest || record.measuredAt > latest.measuredAt ? record : latest, null);
  const recentSleepRecord = input.sleep.reduce<SleepRecord | null>((latest, record) =>
    !latest || record.endedAt > latest.endedAt ? record : latest, null);
  const activitySummary = summarizeActivity(input.activities, input.timeZone, input.date);
  const emotionSummary = summarizeEmotions(input.emotions, input.timeZone, input.date);
  const sleepSummary = summarizeSleep(input.sleep, input.timeZone, input.date);

  const volume = (type: "MILK" | "WATER") => todayBeverages
    .filter((record) => record.type === type && record.volumeMl !== null)
    .reduce((total, record) => total + record.volumeMl!, 0);
  const hasDailyNutrition = todayMeals.length > 0 || todayBeverages.length > 0;
  const notices: string[] = [];
  if (sleepSummary.last7DaysMinutes === 0) {
    notices.push("近 7 天暂无睡眠记录，当前无法判断睡眠趋势。");
  }
  if (activitySummary.last7Days.sessions > 0) {
    notices.push(`近 7 天共记录活动 ${activitySummary.last7Days.totalMinutes} 分钟，其中户外 ${activitySummary.last7Days.outdoorMinutes} 分钟；只反映已填写记录。`);
  }
  if (emotionSummary.last7Days.total > 0) {
    notices.push(`近 7 天共填写 ${emotionSummary.last7Days.total} 次情绪观察；记录频次不用于诊断。`);
  }

  return {
    completion: {
      sleep: todaySleep.length > 0,
      nutrition: hasDailyNutrition,
      activity: todayActivities.length > 0,
      emotion: todayEmotions.length > 0
    },
    latestGrowth: latestGrowthRecord ? {
      date: dateInTimeZone(latestGrowthRecord.measuredAt, input.timeZone),
      heightCm: numeric(latestGrowthRecord.heightCm),
      weightKg: numeric(latestGrowthRecord.weightKg)
    } : null,
    recentSleep: recentSleepRecord ? {
      date: dateInTimeZone(recentSleepRecord.endedAt, input.timeZone),
      minutes: calculateSleepMinutes(
        recentSleepRecord.startedAt, recentSleepRecord.endedAt, recentSleepRecord.awakeMinutes
      ),
      kind: recentSleepRecord.kind
    } : null,
    today: {
      meals: todayMeals.length,
      foodItems: todayMeals.reduce((total, meal) =>
        total + meal.items.filter((item) => !item.deletedAt).length, 0),
      milkMl: hasDailyNutrition ? volume("MILK") : null,
      waterMl: hasDailyNutrition ? volume("WATER") : null,
      unknownBeverages: todayBeverages.filter((record) => record.volumeMl === null).length,
      activityMinutes: todayActivities.reduce((total, record) => total + record.durationMinutes, 0),
      outdoorMinutes: todayActivities.reduce((total, record) => total + (record.outdoorMinutes ?? 0), 0),
      mood: todayEmotions.at(-1)?.mood ?? null
    },
    notices
  };
}
