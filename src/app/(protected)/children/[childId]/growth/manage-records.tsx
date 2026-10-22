import Link from "next/link";
import { notFound } from "next/navigation";

import { getPrisma } from "@/lib/db";
import { requireServerSession } from "@/modules/auth/server-session";
import { findChildForHousehold } from "@/modules/children/child-repository";
import { serializeGrowthHistory } from "@/modules/growth/growth-handlers";
import { listGrowthForChild } from "@/modules/growth/growth-repository";

import { GrowthChart } from "./growth-chart";
import { GrowthForm } from "./growth-form";



export default async function GrowthPage({ params }: { params: Promise<{ childId: string }> }) {
  const { childId } = await params;
  const session = await requireServerSession();
  const prisma = getPrisma();
  const child = await findChildForHousehold(prisma, session.householdId, childId);
  if (!child) notFound();
  const measurements = serializeGrowthHistory(
    await listGrowthForChild(prisma, session.householdId, childId)
  );

  return (
    <main className="profile-shell">
      <Link className="back-link" href="/settings/children">← 返回儿童与记录管理</Link>
      <header className="profile-header compact"><p>{child.name} · 记录管理</p>
        <h1>身高与体重</h1>
        <p>记录原始测量值与测量条件。BMI 和变化量只在所需数据齐全时显示，不提供百分位或医学判断。</p>
      </header>
      <GrowthChart measurements={measurements} />
      <section className="profile-panel"><h2>添加测量</h2><GrowthForm childId={childId} /></section>
      <section className="record-history">
        <h2>历史记录</h2>
        {measurements.length === 0 ? <div className="empty-state">尚无测量记录。</div> : measurements.slice().reverse().map((record) => (
          <details className="record-card" key={record.id}>
            <summary><strong>{new Date(record.measuredAt).toLocaleDateString("zh-CN")}</strong><span>{record.heightCm === null ? "身高未记录" : `${record.heightCm} cm`} · {record.weightKg === null ? "体重未记录" : `${record.weightKg} kg`}</span></summary>
            <div className="record-metrics">
              <span>BMI：{record.bmi ?? "数据不足"}</span>
              <span>身高变化：{record.heightChangeCm === null ? "—" : `${record.heightChangeCm > 0 ? "+" : ""}${record.heightChangeCm} cm`}</span>
              <span>体重变化：{record.weightChangeKg === null ? "—" : `${record.weightChangeKg > 0 ? "+" : ""}${record.weightChangeKg} kg`}</span>
            </div>
            <GrowthForm childId={childId} measurement={record} />
          </details>
        ))}
      </section>
    </main>
  );
}
