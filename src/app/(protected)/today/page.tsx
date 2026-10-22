import Link from "next/link";

import { getPrisma } from "@/lib/db";
import { listActivitiesForChild } from "@/modules/activity/activity-repository";
import { requireServerSession } from "@/modules/auth/server-session";
import { listChildrenForHousehold } from "@/modules/children/child-repository";
import { buildDashboardSnapshot } from "@/modules/dashboard/dashboard-snapshot";
import { listEmotionsForChild } from "@/modules/emotion/emotion-repository";
import { listGrowthForChild } from "@/modules/growth/growth-repository";
import { listBeveragesForChild, listMealsForChild } from "@/modules/nutrition/nutrition-repository";
import { dateInTimeZone } from "@/modules/sleep/sleep-record";
import { listSleepForChild } from "@/modules/sleep/sleep-repository";

export const dynamic = "force-dynamic";

const moodLabels = {
  HAPPY: "😊 开心", CALM: "🙂 平静", ANXIOUS: "😟 焦虑表现", SAD: "😢 难过",
  ANGRY: "😠 愤怒", MIXED: "😶 多种情绪", OTHER: "📝 其他"
} as const;

function valueOrUnknown(value: number | null, unit: string) {
  return value === null ? "未记录" : `${value} ${unit}`;
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
    const [growth, sleep, meals, beverages, activities, emotions] = await Promise.all([
      listGrowthForChild(prisma, auth.householdId, child.id),
      listSleepForChild(prisma, auth.householdId, child.id),
      listMealsForChild(prisma, auth.householdId, child.id),
      listBeveragesForChild(prisma, auth.householdId, child.id),
      listActivitiesForChild(prisma, auth.householdId, child.id),
      listEmotionsForChild(prisma, auth.householdId, child.id)
    ]);
    return {
      child,
      snapshot: buildDashboardSnapshot({ date, timeZone, growth, sleep, meals, beverages, activities, emotions })
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

        <h3 className="dashboard-section-title">快捷记录</h3>
        <div className="quick-actions" aria-label={`${child.name} 的快捷记录`}>
          <Link href={`/settings/children/${child.id}/records/nutrition`}>＋ 饮食奶水</Link><Link href={`/settings/children/${child.id}/records/sleep`}>＋ 睡眠</Link><Link href={`/settings/children/${child.id}/records/activity`}>＋ 运动</Link><Link href={`/settings/children/${child.id}/records/emotion`}>＋ 情绪</Link><Link href={`/settings/children/${child.id}/records/growth`}>＋ 身高体重</Link>
        </div>

        <h3 className="dashboard-section-title">最近数据</h3>
        <div className="dashboard-metrics">
          <div><span>最近身高体重</span><strong>{snapshot.latestGrowth ? `${valueOrUnknown(snapshot.latestGrowth.heightCm, "cm")} · ${valueOrUnknown(snapshot.latestGrowth.weightKg, "kg")}` : "尚无记录"}</strong><small>{snapshot.latestGrowth?.date ?? "添加首次测量"}</small></div>
          <div><span>最近睡眠</span><strong>{snapshot.recentSleep ? `${snapshot.recentSleep.minutes} 分钟` : "尚无记录"}</strong><small>{snapshot.recentSleep?.date ?? "记录夜间睡眠或小睡"}</small></div>
          <div><span>今日奶 / 水</span><strong>{valueOrUnknown(snapshot.today.milkMl, "ml")} · {valueOrUnknown(snapshot.today.waterMl, "ml")}</strong><small>{snapshot.today.unknownBeverages ? `${snapshot.today.unknownBeverages} 条饮品未填容量` : `${snapshot.today.meals} 餐 · ${snapshot.today.foodItems} 项食物`}</small></div>
          <div><span>今日活动</span><strong>{snapshot.today.activityMinutes} 分钟</strong><small>其中户外 {snapshot.today.outdoorMinutes} 分钟</small></div>
          <div><span>今日最近情绪</span><strong>{snapshot.today.mood ? moodLabels[snapshot.today.mood] : "尚无记录"}</strong><small>仅显示家长填写的观察</small></div>
        </div>

        {snapshot.notices.length ? <aside className="trend-notices" aria-label="描述性趋势"><strong>最近记录</strong><ul>{snapshot.notices.map((notice) => <li key={notice}>{notice}</li>)}</ul></aside> : null}
      </article>)}
    </section>}
  </main>;
}

