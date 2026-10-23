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

const moodLabels = {
  HAPPY: "😊 开心", CALM: "🙂 平静", ANXIOUS: "😟 焦虑表现", SAD: "😢 难过",
  ANGRY: "😠 愤怒", MIXED: "😶 多种情绪", OTHER: "📝 其他"
} as const;
const moodNames = {
  HAPPY: "开心", CALM: "平静", ANXIOUS: "焦虑表现", SAD: "难过",
  ANGRY: "愤怒", MIXED: "多种情绪", OTHER: "其他"
} as const;

function valueOrUnknown(value: number | null, unit: string) {
  return value === null ? "未记录" : `${value} ${unit}`;
}

function averageValue(average: { value: number; days: number } | null, unit: string) {
  return average ? `${average.value} ${unit}（${average.days}天）` : "暂无可比较记录";
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
      {dashboards.map(({ child, snapshot }) => <article className="dashboard-card" key={child.id}>
        <div className="dashboard-title"><h2>{child.name}</h2><Link href={`/children/${child.id}`}>查看档案 →</Link></div>

        <div className="completion-grid">
          {([
            ["sleep", "睡眠", "sleep"], ["nutrition", "饮食 / 奶水", "nutrition"],
            ["activity", "运动 / 户外", "activity"], ["emotion", "情绪", "emotion"]
          ] as const).map(([key, label, route]) => <Link className={`completion-item ${snapshot.completion[key] ? "done" : "missing"}`} href={`/settings/children/${child.id}/records/${route}`} key={key}><span>{snapshot.completion[key] ? "已记录" : "待记录"}</span><strong>{label}</strong></Link>)}
        </div>

        <h3 className="dashboard-section-title">今日概览</h3>
        <p className="dashboard-comparison-note">过去7天对照仅基于有记录日期；今天为截至当前数据。</p>
        <div className="today-overview-grid">
          <div className="today-overview-item"><span>睡眠</span><strong>{snapshot.today.sleepMinutes === null ? "待记录" : `${snapshot.today.sleepMinutes} 分钟`}</strong><small className="today-comparison">过去7天有记录日均 {averageValue(snapshot.comparison.sleepMinutes, "分钟")}</small></div>
          <div className="today-overview-item"><span>饮食</span><strong>{snapshot.completion.nutrition ? `${snapshot.today.meals} 餐 · ${snapshot.today.foodItems} 项食物` : "待记录"}</strong><small className="today-comparison">{snapshot.comparison.meals && snapshot.comparison.foodItems ? `过去7天有记录日均 ${snapshot.comparison.meals.value} 餐 · ${snapshot.comparison.foodItems.value} 项食物（${snapshot.comparison.meals.days}天）` : "过去7天暂无可比较记录"}</small></div>
          <div className="today-overview-item"><span>奶 / 水</span><strong>{valueOrUnknown(snapshot.today.milkMl, "ml")} · {valueOrUnknown(snapshot.today.waterMl, "ml")}</strong>{snapshot.today.unknownBeverages ? <small>{snapshot.today.unknownBeverages} 条未填容量</small> : null}<small className="today-comparison">过去7天有记录日均 奶 {averageValue(snapshot.comparison.milkMl, "ml")} · 水 {averageValue(snapshot.comparison.waterMl, "ml")}</small></div>
          <div className="today-overview-item"><span>活动</span><strong>{snapshot.completion.activity ? `${snapshot.today.activityMinutes} 分钟 · 户外 ${valueOrUnknown(snapshot.today.outdoorMinutes, "分钟")}` : "待记录"}</strong>{snapshot.today.unknownOutdoorActivities ? <small>{snapshot.today.unknownOutdoorActivities} 条活动未填户外时长</small> : null}<small className="today-comparison">过去7天有记录日均 活动 {averageValue(snapshot.comparison.activityMinutes, "分钟")} · 户外 {averageValue(snapshot.comparison.outdoorMinutes, "分钟")}</small></div>
          <div className="today-overview-item emotion"><span>情绪观察</span><strong>{snapshot.today.mood ? moodLabels[snapshot.today.mood] : "待记录"}</strong><small className="today-comparison">{snapshot.comparison.mood ? `过去7天最常记录 ${moodNames[snapshot.comparison.mood.mood]}（${snapshot.comparison.mood.count}/${snapshot.comparison.mood.total}次）` : "过去7天暂无可比较记录"}</small></div>
        </div>

        <h3 className="dashboard-section-title">快捷记录</h3>
        <div className="quick-actions" aria-label={`${child.name} 的快捷记录`}>
          <Link href={`/settings/children/${child.id}/records/nutrition`}>＋ 饮食奶水</Link><Link href={`/settings/children/${child.id}/records/sleep`}>＋ 睡眠</Link><Link href={`/settings/children/${child.id}/records/activity`}>＋ 运动</Link><Link href={`/settings/children/${child.id}/records/emotion`}>＋ 情绪</Link><Link href={`/settings/children/${child.id}/records/growth`}>＋ 身高体重</Link>
        </div>
      </article>)}
    </section>}
  </main>;
}

