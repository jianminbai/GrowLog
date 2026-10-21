import Link from "next/link";

import { getPrisma } from "@/lib/db";
import { requireServerSession } from "@/modules/auth/server-session";
import { listAuditEvents, listHistoryEntries } from "@/modules/history/history-repository";

export const dynamic = "force-dynamic";

const kindLabels = {
  GROWTH: "生长", SLEEP: "睡眠", MEAL: "饮食", BEVERAGE: "饮品", ACTIVITY: "活动", EMOTION: "情绪"
} as const;
const actionLabels = {
  CREATE: "创建", UPDATE: "修改", DELETE: "删除", RESTORE: "恢复", LOGIN: "登录", LOGOUT: "退出"
} as const;

export default async function HistoryPage({
  searchParams
}: {
  searchParams: Promise<{ deleted?: string }>;
}) {
  const auth = await requireServerSession();
  const includeDeleted = (await searchParams).deleted === "1";
  const prisma = getPrisma();
  const [entries, audits, household] = await Promise.all([
    listHistoryEntries(prisma, auth.householdId, includeDeleted),
    listAuditEvents(prisma, auth.householdId, 100),
    prisma.household.findUnique({ where: { id: auth.householdId }, select: { timeZone: true } })
  ]);
  const timeZone = household?.timeZone ?? "UTC";
  const timestamp = (value: Date) => value.toLocaleString("zh-CN", { timeZone, hour12: false });

  return <main className="profile-shell">
    <header className="profile-header compact"><span className="eyebrow">History & audit</span><h1>历史与审计</h1><p>按时间查看所有记录，并进入原始表单进行修改、删除或恢复。审计区只显示发生变更的字段名，不展示敏感字段值。</p></header>
    <div className="history-toolbar">
      <strong>{entries.length} 条记录</strong>
      <Link href={includeDeleted ? "/history" : "/history?deleted=1"}>{includeDeleted ? "隐藏已删除记录" : "查看已删除记录"}</Link>
    </div>
    <section className="unified-history" aria-labelledby="all-records">
      <h2 id="all-records">全部记录</h2>
      {entries.length === 0 ? <div className="empty-state">当前筛选下没有记录。</div> : <div className="history-list">{entries.map((entry) =>
        <Link className={`history-entry${entry.deletedAt ? " deleted" : ""}`} href={entry.href} key={`${entry.kind}-${entry.id}`}>
          <div><span>{kindLabels[entry.kind]} · {entry.childName}</span><strong>{entry.title}</strong><small>{entry.detail}</small></div>
          <div className="history-time"><time>{timestamp(entry.occurredAt)}</time>{entry.deletedAt ? <em>已删除 · 前往恢复</em> : <em>前往编辑</em>}</div>
        </Link>)}</div>}
    </section>
    <section className="audit-section" aria-labelledby="audit-events">
      <h2 id="audit-events">最近审计事件</h2>
      {audits.length === 0 ? <div className="empty-state">尚无审计事件。</div> : <div className="audit-list">{audits.map((event) =>
        <article className="audit-entry" key={event.id}>
          <div><strong>{actionLabels[event.action]} {event.entityType}</strong><span>{event.actorId}</span></div>
          <div><time>{timestamp(event.createdAt)}</time><small>{event.changedFields.length ? `字段：${event.changedFields.join("、")}` : "无字段值写入审计"}</small></div>
        </article>)}</div>}
    </section>
  </main>;
}
