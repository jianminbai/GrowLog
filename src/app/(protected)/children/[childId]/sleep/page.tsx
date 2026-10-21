import Link from "next/link";
import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/db";
import { requireServerSession } from "@/modules/auth/server-session";
import { findChildForHousehold } from "@/modules/children/child-repository";
import { serializeSleep } from "@/modules/sleep/sleep-handlers";
import { dateInTimeZone, summarizeSleep } from "@/modules/sleep/sleep-record";
import { getHouseholdTimeZone, listSleepForChild } from "@/modules/sleep/sleep-repository";
import { SleepForm } from "./sleep-form";

export const dynamic = "force-dynamic";
export default async function SleepPage({ params }: { params: Promise<{ childId: string }> }) {
  const { childId } = await params; const auth = await requireServerSession(); const prisma = getPrisma();
  const child = await findChildForHousehold(prisma, auth.householdId, childId); if (!child) notFound();
  const stored = await listSleepForChild(prisma, auth.householdId, childId, true);
  const records = stored.map(serializeSleep); const active = records.filter((r) => !r.deletedAt); const deleted = records.filter((r) => r.deletedAt);
  const timeZone = await getHouseholdTimeZone(prisma, auth.householdId);
  const summary = summarizeSleep(stored.filter((r) => !r.deletedAt), timeZone, dateInTimeZone(new Date(), timeZone));
  return <main className="profile-shell">
    <Link className="back-link" href={`/children/${childId}`}>← 返回 {child.name} 的档案</Link>
    <header className="profile-header compact"><span className="eyebrow">Sleep history</span><h1>睡眠记录</h1><p>跨午夜睡眠会归到家庭时区中的醒来日期；汇总为净睡眠分钟，不作医学判断。</p></header>
    <section className="snapshot-grid sleep-summary"><div className="snapshot-card blue"><span>近 7 天</span><strong>{summary.last7DaysMinutes} 分钟</strong></div><div className="snapshot-card mint"><span>近 30 天</span><strong>{summary.last30DaysMinutes} 分钟</strong></div></section>
    <section className="profile-panel"><h2>添加睡眠</h2><SleepForm childId={childId} /></section>
    <section className="record-history"><h2>历史记录</h2>{active.length === 0 ? <div className="empty-state">尚无睡眠记录。</div> : active.slice().reverse().map((record) => <details className="record-card" key={record.id}><summary><strong>{record.kind === "NIGHT" ? "夜间" : "小睡"}</strong><span>{record.sleepMinutes} 分钟 · {new Date(record.endedAt).toLocaleDateString("zh-CN")}</span></summary><SleepForm childId={childId} record={record} /></details>)}</section>
    {deleted.length ? <section className="deleted-history"><h2>已删除记录</h2>{deleted.map((record) => <SleepForm childId={childId} record={record} key={record.id} />)}</section> : null}
  </main>;
}
