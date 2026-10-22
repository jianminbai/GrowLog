import Link from "next/link";
import { notFound } from "next/navigation";

import { getPrisma } from "@/lib/db";
import { requireServerSession } from "@/modules/auth/server-session";
import { findChildForHousehold } from "@/modules/children/child-repository";
import { serializeEmotion } from "@/modules/emotion/emotion-handlers";
import { summarizeEmotions } from "@/modules/emotion/emotion-record";
import { getEmotionHouseholdTimeZone, listEmotionsForChild } from "@/modules/emotion/emotion-repository";
import { dateInTimeZone } from "@/modules/sleep/sleep-record";

import { EmotionForm, moodLabels } from "./emotion-form";

export const dynamic = "force-dynamic";

export default async function EmotionPage({ params }: { params: Promise<{ childId: string }> }) {
  const { childId } = await params;
  const auth = await requireServerSession();
  const prisma = getPrisma();
  const child = await findChildForHousehold(prisma, auth.householdId, childId);
  if (!child) notFound();
  const [stored, timeZone] = await Promise.all([
    listEmotionsForChild(prisma, auth.householdId, childId, true),
    getEmotionHouseholdTimeZone(prisma, auth.householdId)
  ]);
  const records = stored.map(serializeEmotion);
  const active = records.filter((record) => !record.deletedAt);
  const deleted = records.filter((record) => record.deletedAt);
  const summary = summarizeEmotions(
    stored.filter((record) => !record.deletedAt), timeZone, dateInTimeZone(new Date(), timeZone)
  );
  const frequent = Object.entries(summary.last30Days.byMood)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([mood, count]) => `${moodLabels[mood as keyof typeof moodLabels]} ${count} 次`)
    .join(" · ");

  return <main className="profile-shell">
    <Link className="back-link" href={`/children/${childId}`}>← 返回 {child.name} 的档案</Link>
    <header className="profile-header compact"><h1>情绪观察</h1><p>用简短的总体情绪、标签和情境回顾变化。这里展示描述性频次，不提供诊断或风险评分。</p></header>
    <section className="snapshot-grid sleep-summary">
      <div className="snapshot-card rose"><span>近 7 天记录</span><strong>{summary.last7Days.total} 次</strong></div>
      <div className="snapshot-card mint"><span>近 30 天记录</span><strong>{summary.last30Days.total} 次</strong></div>
    </section>
    {frequent ? <p className="care-note">近 30 天记录频次：{frequent}。次数仅反映已填写的观察。</p> : null}
    <section className="profile-panel"><h2>快速记录</h2><EmotionForm childId={childId} /></section>
    <section className="record-history"><h2>历史记录</h2>
      {active.length === 0 ? <div className="empty-state">尚无情绪记录。</div> : active.slice().reverse().map((record) =>
        <details className="record-card" key={record.id}><summary><strong>{moodLabels[record.mood]}</strong><span>{record.tags.join(" · ") || "无标签"} · {new Date(record.occurredAt).toLocaleDateString("zh-CN")}</span></summary><EmotionForm childId={childId} record={record} /></details>)}
    </section>
    {deleted.length ? <section className="deleted-history"><h2>已删除记录</h2>{deleted.map((record) => <EmotionForm childId={childId} record={record} key={record.id} />)}</section> : null}
  </main>;
}
