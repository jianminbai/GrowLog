import Link from "next/link";
import { notFound } from "next/navigation";

import { getPrisma } from "@/lib/db";
import { serializeActivity } from "@/modules/activity/activity-handlers";
import { summarizeActivity } from "@/modules/activity/activity-record";
import { getActivityHouseholdTimeZone, listActivitiesForChild } from "@/modules/activity/activity-repository";
import { requireServerSession } from "@/modules/auth/server-session";
import { findChildForHousehold } from "@/modules/children/child-repository";
import { dateInTimeZone } from "@/modules/sleep/sleep-record";

import { ActivityForm } from "./activity-form";

export const dynamic = "force-dynamic";

export default async function ActivityPage({ params }: { params: Promise<{ childId: string }> }) {
  const { childId } = await params;
  const auth = await requireServerSession();
  const prisma = getPrisma();
  const child = await findChildForHousehold(prisma, auth.householdId, childId);
  if (!child) notFound();
  const [stored, timeZone] = await Promise.all([
    listActivitiesForChild(prisma, auth.householdId, childId, true),
    getActivityHouseholdTimeZone(prisma, auth.householdId)
  ]);
  const records = stored.map(serializeActivity);
  const active = records.filter((record) => !record.deletedAt);
  const deleted = records.filter((record) => record.deletedAt);
  const summary = summarizeActivity(
    stored.filter((record) => !record.deletedAt), timeZone, dateInTimeZone(new Date(), timeZone)
  );

  return <main className="profile-shell">
    <Link className="back-link" href={`/children/${childId}`}>← 返回 {child.name} 的档案</Link>
    <header className="profile-header compact"><h1>运动与户外</h1><p>分别记录活动总时长、户外时长和运动强度，查看最近 7 天的实际趋势。</p></header>
    <section className="snapshot-grid sleep-summary">
      <div className="snapshot-card mint"><span>近 7 天总活动</span><strong>{summary.last7Days.totalMinutes} 分钟</strong></div>
      <div className="snapshot-card blue"><span>近 7 天户外</span><strong>{summary.last7Days.outdoorMinutes} 分钟</strong></div>
      <div className="snapshot-card peach"><span>近 7 天中高强度</span><strong>{summary.last7Days.moderateVigorousMinutes} 分钟</strong></div>
      <div className="snapshot-card rose"><span>近 7 天记录</span><strong>{summary.last7Days.sessions} 次</strong></div>
    </section>
    <section className="profile-panel"><h2>添加活动</h2><ActivityForm childId={childId} /></section>
    <section className="record-history"><h2>历史记录</h2>
      {active.length === 0 ? <div className="empty-state">尚无活动记录。</div> : active.slice().reverse().map((record) =>
        <details className="record-card" key={record.id}><summary><strong>{record.activityType}</strong><span>{record.durationMinutes} 分钟 · 户外 {record.outdoorMinutes ?? 0} 分钟 · {new Date(record.occurredAt).toLocaleDateString("zh-CN")}</span></summary><ActivityForm childId={childId} record={record} /></details>)}
    </section>
    {deleted.length ? <section className="deleted-history"><h2>已删除记录</h2>{deleted.map((record) => <ActivityForm childId={childId} record={record} key={record.id} />)}</section> : null}
  </main>;
}
