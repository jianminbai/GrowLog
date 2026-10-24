import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { getPrisma } from "@/lib/db";
import { requireServerSession } from "@/modules/auth/server-session";
import { findChildForHousehold } from "@/modules/children/child-repository";
import { serializeGrowthHistory } from "@/modules/growth/growth-handlers";
import { calculateAnnualizedHeightGrowth } from "@/modules/growth/growth-record";
import { listGrowthForChild } from "@/modules/growth/growth-repository";
import { serializeSleep } from "@/modules/sleep/sleep-handlers";
import { dateInTimeZone } from "@/modules/sleep/sleep-record";
import { getHouseholdTimeZone, listSleepForChild } from "@/modules/sleep/sleep-repository";
import { listActivitiesForChild } from "@/modules/activity/activity-repository";
import { listEmotionsForChild } from "@/modules/emotion/emotion-repository";
import { serializeBeverage, serializeMeal } from "@/modules/nutrition/nutrition-handlers";
import { listBeveragesForChild, listMealsForChild } from "@/modules/nutrition/nutrition-repository";
import { dailyTotals, type SeriesPoint } from "@/modules/reports/daily-series";
import { recordDomains, type RecordDomain } from "@/modules/reports/record-domains";
import { RecordTable, type ReportTable } from "./record-table";
import { TimeSeriesChart } from "./time-series-chart";

const sourceLabels = { HOME: "家庭", HOSPITAL: "医院", KINDERGARTEN: "幼儿园", MANUAL: "手工录入", IMPORT: "导入" };
const moodLabels = { HAPPY: "开心", CALM: "平静", ANXIOUS: "焦虑表现", SAD: "难过", ANGRY: "愤怒", MIXED: "多种情绪", OTHER: "其他" };
const mealLabels = { BREAKFAST: "早餐", MORNING_SNACK: "上午加餐", LUNCH: "午餐", AFTERNOON_SNACK: "下午加餐", DINNER: "晚餐", OTHER: "其他" };
const beverageLabels = { MILK: "奶", WATER: "水", YOGURT_DRINK: "酸奶饮品", OTHER: "其他饮品" };
const intensityLabels = { LIGHT: "轻度", MODERATE: "中度", VIGOROUS: "高强度", UNKNOWN: "未记录" };
const structureLabels = { FREE_PLAY: "自由活动", STRUCTURED: "有组织活动", MIXED: "混合活动" };
const textLabel = (labels: Record<string, string>, value: string) => labels[value] ?? value;
const optional = (value: unknown) => value === null || value === undefined || value === "" ? "未记录" : String(value);

export async function ChildRecordReport({ childId, domain }: { childId: string; domain: RecordDomain }) {
  const auth = await requireServerSession();
  const prisma = getPrisma();
  const child = await findChildForHousehold(prisma, auth.householdId, childId);
  if (!child) notFound();
  const timeZone = await getHouseholdTimeZone(prisma, auth.householdId);
  const timestamp = (at: string | Date) => new Date(at).toLocaleString("zh-CN", { timeZone, hour12: false });
  const charts: { title: string; unit: string; points: SeriesPoint[]; dateOnly?: boolean }[] = [];
  const tables: ReportTable[] = [];
  let distribution: ReactNode = null;
  const dailyChart = (title: string, unit: string, points: SeriesPoint[]) => charts.push({ title, unit, points: dailyTotals(points, timeZone) });

  if (domain === "growth") {
    const rows = serializeGrowthHistory(await listGrowthForChild(prisma, auth.householdId, childId));
    const annualizedHeightGrowth = calculateAnnualizedHeightGrowth(rows.map(r => ({
      measuredAt: new Date(r.measuredAt), heightCm: r.heightCm
    })));
    charts.push(
      { title: "身高趋势", unit: "cm", dateOnly: true, points: rows.map(r => ({ at: r.measuredAt, value: r.heightCm })) },
      { title: "体重趋势", unit: "kg", dateOnly: true, points: rows.map(r => ({ at: r.measuredAt, value: r.weightKg })) }
    );
    tables.push({ title: "测量记录", className: "measurement-table sticky-first-column", headers: ["测量时间", "身高（cm）", "年化身高增长（cm/年）", "体重（kg）", "BMI（kg/m²）", "身高变化（cm）", "体重变化（kg）", "来源", "详情"],
      rows: rows.map((r, index) => ({ id: r.id, cells: [<time className="measurement-date" dateTime={r.measuredAt} key={`${r.id}-date`}>{dateInTimeZone(new Date(r.measuredAt), timeZone)}</time>, r.heightCm, annualizedHeightGrowth[index], r.weightKg, r.bmi, r.heightChangeCm, r.weightChangeKg, sourceLabels[r.source],
        <details className="measurement-detail" key={`${r.id}-detail`}><summary>查看详情</summary><p>地点：{optional(r.place)}；方法：{optional(r.method)}；设备：{optional(r.device)}；精度：{optional(r.precisionNote)}；备注：{optional(r.notes)}</p></details>] })).reverse() });
  } else if (domain === "sleep") {
    const rows = (await listSleepForChild(prisma, auth.householdId, childId)).map(serializeSleep);
    dailyChart("每日净睡眠时长", "分钟", rows.map(r => ({ at: r.endedAt, value: r.sleepMinutes })));
    tables.push({ title: "睡眠记录", headers: ["类型", "开始时间", "结束时间", "净睡眠（分钟）", "清醒（分钟）", "醒来次数", "来源", "观察备注"],
      rows: rows.slice().reverse().map(r => ({ id: r.id, cells: [r.kind === "NIGHT" ? "夜间睡眠" : "小睡", timestamp(r.startedAt), timestamp(r.endedAt), r.sleepMinutes, r.awakeMinutes, r.wakeCount, sourceLabels[r.source], r.observation] })) });
  } else if (domain === "activity") {
    const rows = await listActivitiesForChild(prisma, auth.householdId, childId);
    dailyChart("每日活动时长", "分钟", rows.map(r => ({ at: r.occurredAt.toISOString(), value: r.durationMinutes })));
    dailyChart("每日户外时长", "分钟", rows.map(r => ({ at: r.occurredAt.toISOString(), value: r.outdoorMinutes })));
    tables.push({ title: "活动记录", headers: ["时间", "活动", "时长（分钟）", "户外（分钟）", "强度", "组织形式", "参与情况", "来源", "备注"],
      rows: rows.slice().reverse().map(r => ({ id: r.id, cells: [timestamp(r.occurredAt), r.activityType, r.durationMinutes, r.outdoorMinutes, textLabel(intensityLabels, r.intensity), textLabel(structureLabels, r.structure), r.engagement, sourceLabels[r.source], r.notes] })) });
  } else if (domain === "nutrition") {
    const [storedMeals, storedBeverages] = await Promise.all([
      listMealsForChild(prisma, auth.householdId, childId), listBeveragesForChild(prisma, auth.householdId, childId)
    ]);
    const meals = storedMeals.map(serializeMeal);
    const beverages = storedBeverages.map(serializeBeverage);
    dailyChart("每日已记录餐次", "次", meals.map(r => ({ at: r.occurredAt, value: 1 })));
    for (const type of ["MILK", "WATER", "YOGURT_DRINK", "OTHER"] as const) {
      dailyChart(`每日${beverageLabels[type]}量`, "ml", beverages.filter(r => r.type === type).map(r => ({ at: r.occurredAt, value: r.volumeMl })));
    }
    tables.push({ title: "餐食记录", headers: ["时间", "餐次", "食物与数量", "进食表现", "来源", "备注"],
      rows: meals.slice().reverse().map(r => ({ id: r.id, cells: [timestamp(r.occurredAt), textLabel(mealLabels, r.type),
        r.items.map(i => `${i.name}（${optional(i.category)}）：提供 ${optional(i.offeredAmount)}，摄入 ${optional(i.consumedAmount)}，估算 ${optional(i.estimatedAmount)}；单位：${optional(i.amountUnit)}；${i.isNewFood ? "新食物" : "非新食物"}；反应：${optional(i.reactionNote)}`).join("\n"), r.appetite, sourceLabels[r.source], r.notes] })) });
    tables.push({ title: "奶水与饮品记录", headers: ["时间", "类型", "容量（ml）", "来源", "备注"],
      rows: beverages.slice().reverse().map(r => ({ id: r.id, cells: [timestamp(r.occurredAt), textLabel(beverageLabels, r.type), r.volumeMl, sourceLabels[r.source], r.notes] })) });
  } else {
    const rows = await listEmotionsForChild(prisma, auth.householdId, childId);
    const counts = Object.entries(moodLabels).map(([key, label]) => ({ label, count: rows.filter(r => r.mood === key).length }));
    const max = Math.max(1, ...counts.map(c => c.count));
    distribution = <figure className="report-chart">
      <figcaption>情绪观察分布</figcaption>
      {rows.length ? <div role="img" aria-label={counts.map(c => `${c.label} ${c.count} 次`).join("，")} className="emotion-bars">
        {counts.map(c => <div className="emotion-bar-row" key={c.label}><span>{c.label}</span><div className="emotion-bar-track"><span style={{ width: `${c.count / max * 100}%` }} /></div><strong>{c.count} 次</strong></div>)}
      </div> : <p className="care-note">暂无情绪观察记录。</p>}
      <p className="care-note">次数仅反映已填写的观察，不代表情绪评分或医学判断。</p>
    </figure>;
    dailyChart("每日观察次数", "次", rows.map(r => ({ at: r.occurredAt.toISOString(), value: 1 })));
    tables.push({ title: "情绪记录", headers: ["时间", "情绪", "标签", "情境", "持续（分钟）", "同伴互动", "亲子互动", "来源", "备注"],
      rows: rows.slice().reverse().map(r => ({ id: r.id, cells: [timestamp(r.occurredAt), moodLabels[r.mood], r.tags.join("、"), r.context, r.durationMinutes, r.peerInteraction, r.parentInteraction, sourceLabels[r.source], r.notes] })) });
  }
  return <main className="profile-shell report-shell">
    <Link className="back-link" href={`/children/${child.id}`}>← 返回 {child.name} 的档案</Link>
    <header className="profile-header compact"><h1>{recordDomains.find(d => d.route === domain)!.label}</h1><p>{child.name} · 成长趋势与记录明细</p></header>
    <div className="report-charts">{charts.map(c => <TimeSeriesChart key={c.title} {...c} timeZone={timeZone} />)}{distribution}</div>
    {tables.map(t => <RecordTable key={t.title} {...t} />)}
  </main>;
}
