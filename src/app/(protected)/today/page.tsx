import Link from "next/link";

import { getPrisma } from "@/lib/db";
import { listActivitiesForChild } from "@/modules/activity/activity-repository";
import { requireServerSession } from "@/modules/auth/server-session";
import { listChildrenForHousehold } from "@/modules/children/child-repository";
import { buildDashboardSnapshot } from "@/modules/dashboard/dashboard-snapshot";
import { listEmotionsForChild } from "@/modules/emotion/emotion-repository";
import { listBeveragesForChild, listMealsForChild } from "@/modules/nutrition/nutrition-repository";
import { dateInTimeZone } from "@/modules/sleep/sleep-record";
import { listSleepForChild } from "@/modules/sleep/sleep-repository";

export const dynamic = "force-dynamic";

const moodNames = {
  HAPPY: "开心", CALM: "平静", ANXIOUS: "焦虑表现", SAD: "难过",
  ANGRY: "愤怒", MIXED: "多种情绪", OTHER: "其他"
} as const;
const periods = ["今天", "7天", "2周", "1个月"] as const;

function compactValue(value: number | null, unit = "") {
  return value === null ? "—" : `${value}${unit}`;
}

function pairedValue(first: number | null, second: number | null, unit: string) {
  return `${compactValue(first)}/${compactValue(second)}${unit}`;
}

function mealValue(meals: number | null, foodItems: number | null) {
  return meals === null || foodItems === null ? "—" : `${meals}餐/${foodItems}项`;
}

function MetricCard({ label, values, assistive }: { label: string; values: string[]; assistive?: string }) {
  return <div className="today-overview-item" aria-label={`${label}对照`}>
    <span className="today-overview-label">{label}</span>
    <div className="today-period-grid">{periods.map((period, index) => <div className="today-period" key={period}>
      <small>{period}</small><strong>{values[index]}</strong>
    </div>)}</div>
    {assistive ? <span className="sr-only">{assistive}</span> : null}
  </div>;
}

export default async function TodayPage() {
  const auth = await requireServerSession();
  const prisma = getPrisma();
  const [children, household] = await Promise.all([
    listChildrenForHousehold(prisma, auth.householdId),
    prisma.household.findUnique({ where: { id: auth.householdId }, select: { timeZone: true } })
  ]);
  const timeZone = household?.timeZone ?? "UTC";
  const date = dateInTimeZone(new Date(), timeZone);
  const dashboards = await Promise.all(children.map(async (child) => {
    const [sleep, meals, beverages, activities, emotions] = await Promise.all([
      listSleepForChild(prisma, auth.householdId, child.id),
      listMealsForChild(prisma, auth.householdId, child.id),
      listBeveragesForChild(prisma, auth.householdId, child.id),
      listActivitiesForChild(prisma, auth.householdId, child.id),
      listEmotionsForChild(prisma, auth.householdId, child.id)
    ]);
    return {
      child,
      snapshot: buildDashboardSnapshot({ date, timeZone, sleep, meals, beverages, activities, emotions })
    };
  }));

  return <main className="today-shell">
    <header className="today-header">
      <div><h1>今天</h1><p className="today-date">{date} · {timeZone}</p><p>快速补齐今日记录。空白表示尚未填写，不代表发生了异常。</p></div>
    </header>

    {dashboards.length === 0 ? <section className="empty-state dashboard-empty">
      <p>先建立儿童档案，GrowLog 就会在这里整理今天已记录和待记录的项目。</p>
      <Link className="primary-action inline-action" href="/settings/children/new">建立儿童档案</Link>
    </section> : <section className="dashboard-children" aria-label="今日成长概览">
      {dashboards.map(({ child, snapshot }) => {
        const comparisons = [snapshot.comparison.sevenDays, snapshot.comparison.twoWeeks, snapshot.comparison.oneMonth];
        return <article className="dashboard-card" key={child.id}>
          <div className="dashboard-title"><h2>{child.name}</h2><Link href={`/children/${child.id}`}>查看档案 →</Link></div>

          <div className="completion-grid">
            {([
              ["sleep", "睡眠", "sleep"], ["nutrition", "饮食 / 奶水", "nutrition"],
              ["activity", "运动 / 户外", "activity"], ["emotion", "情绪", "emotion"]
            ] as const).map(([key, label, route]) => <Link className={`completion-item ${snapshot.completion[key] ? "done" : "missing"}`} href={`/settings/children/${child.id}/records/${route}`} key={key}><span>{snapshot.completion[key] ? "已记录" : "待记录"}</span><strong>{label}</strong></Link>)}
          </div>

          <h3 className="dashboard-section-title">今日概览</h3>
          <p className="dashboard-comparison-note">对照为有记录日均，不含今天。</p>
          <div className="today-overview-grid">
            <MetricCard label="睡眠" values={[compactValue(snapshot.today.sleepMinutes, "分"), ...comparisons.map(item => compactValue(item.sleepMinutes?.value ?? null, "分"))]} />
            <MetricCard label="饮食" values={[
              mealValue(snapshot.today.meals, snapshot.today.foodItems),
              ...comparisons.map(item => mealValue(item.meals?.value ?? null, item.foodItems?.value ?? null))
            ]} />
            <MetricCard label="奶/水" values={[
              pairedValue(snapshot.today.milkMl, snapshot.today.waterMl, "ml"),
              ...comparisons.map(item => pairedValue(item.milkMl?.value ?? null, item.waterMl?.value ?? null, "ml"))
            ]} assistive={snapshot.today.unknownBeverages ? `${snapshot.today.unknownBeverages} 条今日饮品未填容量` : undefined} />
            <MetricCard label="活动/户外" values={[
              snapshot.completion.activity ? pairedValue(snapshot.today.activityMinutes, snapshot.today.outdoorMinutes, "分") : "—",
              ...comparisons.map(item => pairedValue(item.activityMinutes?.value ?? null, item.outdoorMinutes?.value ?? null, "分"))
            ]} assistive={snapshot.today.unknownOutdoorActivities ? `${snapshot.today.unknownOutdoorActivities} 条今日活动未填户外时长` : undefined} />
            <MetricCard label="情绪" values={[
              snapshot.today.mood ? moodNames[snapshot.today.mood] : "—",
              ...comparisons.map(item => item.mood ? moodNames[item.mood.mood] : "—")
            ]} />
          </div>

          <h3 className="dashboard-section-title">快捷记录</h3>
          <div className="quick-actions" aria-label={`${child.name} 的快捷记录`}>
            <Link href={`/settings/children/${child.id}/records/nutrition`}>＋ 饮食奶水</Link><Link href={`/settings/children/${child.id}/records/sleep`}>＋ 睡眠</Link><Link href={`/settings/children/${child.id}/records/activity`}>＋ 运动</Link><Link href={`/settings/children/${child.id}/records/emotion`}>＋ 情绪</Link><Link href={`/settings/children/${child.id}/records/growth`}>＋ 身高体重</Link>
          </div>
        </article>;
      })}
    </section>}
  </main>;
}

