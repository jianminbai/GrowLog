import Link from "next/link";

import { getPrisma } from "@/lib/db";
import { requireServerSession } from "@/modules/auth/server-session";
import { listAuditEvents, listHistoryEntries, type HistoryEntry } from "@/modules/history/history-repository";

import { RestoreDeletedRecordButton } from "./restore-deleted-record-button";

export const dynamic = "force-dynamic";

const kindLabels = {
  GROWTH: "生长", SLEEP: "睡眠", MEAL: "饮食", BEVERAGE: "饮品", ACTIVITY: "活动", EMOTION: "情绪"
} as const;
const actionLabels = {
  CREATE: "创建", UPDATE: "修改", DELETE: "删除", RESTORE: "恢复", LOGIN: "登录", LOGOUT: "退出"
} as const;

function restoreEndpoint(entry: HistoryEntry): string {
  const segments = {
    GROWTH: `growth/${entry.id}`,
    SLEEP: `sleep/${entry.id}`,
    MEAL: `nutrition/meals/${entry.id}`,
    BEVERAGE: `nutrition/beverages/${entry.id}`,
    ACTIVITY: `activities/${entry.id}`,
    EMOTION: `emotions/${entry.id}`
  } as const;
  return `/api/children/${entry.childId}/${segments[entry.kind]}/restore`;
}

export default async function DataManagementPage() {
  const auth = await requireServerSession();
  const prisma = getPrisma();
  const [entries, audits, household] = await Promise.all([
    listHistoryEntries(prisma, auth.householdId, true),
    listAuditEvents(prisma, auth.householdId, 100),
    prisma.household.findUnique({ where: { id: auth.householdId }, select: { timeZone: true } })
  ]);
  const deleted = entries.filter((entry) => entry.deletedAt);
  const timeZone = household?.timeZone ?? "UTC";
  const timestamp = (value: Date) => value.toLocaleString("zh-CN", { timeZone, hour12: false });

  return <main className="profile-shell">
    <Link className="back-link" href="/settings">← 返回设置</Link>
    <header className="profile-header compact">
      <h1>数据管理</h1>
      <p>恢复误删记录，并查看当前家庭最近的脱敏审计事件。</p>
    </header>
    <section className="profile-panel deleted-management" aria-labelledby="deleted-records-heading">
      <h2 id="deleted-records-heading">已删除记录</h2>
      {deleted.length === 0 ? <div className="empty-state">暂无已删除记录。</div> : <div className="deleted-management-list">{deleted.map((entry) =>
        <article className="deleted-management-entry" key={`${entry.kind}-${entry.id}`}>
          <div>
            <span>{kindLabels[entry.kind]} · {entry.childName}</span>
            <strong>{entry.title}</strong>
            <small>{entry.detail} · {timestamp(entry.occurredAt)}</small>
          </div>
          <RestoreDeletedRecordButton endpoint={restoreEndpoint(entry)} label={entry.title} />
        </article>)}</div>}
    </section>
    <section className="profile-panel audit-section" aria-labelledby="audit-events-heading">
      <h2 id="audit-events-heading">最近审计事件</h2>
      <p className="care-note">仅显示操作者、动作、对象、时间和变更字段名，不展示字段值。</p>
      {audits.length === 0 ? <div className="empty-state">尚无审计事件。</div> : <div className="audit-list">{audits.map((event) =>
        <article className="audit-entry" key={event.id}>
          <div><strong>{actionLabels[event.action]} {event.entityType}</strong><span>{event.actorId}</span></div>
          <div><time>{timestamp(event.createdAt)}</time><small>{event.changedFields.length ? `字段：${event.changedFields.join("、")}` : "无字段值写入审计"}</small></div>
        </article>)}</div>}
    </section>
  </main>;
}
