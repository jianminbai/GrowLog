import { getPrisma } from "@/lib/db";
import { requireServerSession } from "@/modules/auth/server-session";
import { listHistoryEntries } from "@/modules/history/history-repository";
import { groupHistoryEntries } from "@/modules/history/history-view";

export const dynamic = "force-dynamic";

const kindLabels = {
  GROWTH: "生长", SLEEP: "睡眠", MEAL: "饮食", BEVERAGE: "饮品", ACTIVITY: "活动", EMOTION: "情绪"
} as const;
export default async function HistoryPage() {
  const auth = await requireServerSession();
  const prisma = getPrisma();
  const [entries, household] = await Promise.all([
    listHistoryEntries(prisma, auth.householdId, false),
    prisma.household.findUnique({ where: { id: auth.householdId }, select: { timeZone: true } })
  ]);
  const timeZone = household?.timeZone ?? "UTC";
  const groups = groupHistoryEntries(entries, timeZone);

  return <main className="profile-shell history-shell">
    <header className="profile-header compact history-hero"><span className="history-eyebrow">按日回顾</span><h1>成长足迹</h1><p>按日期回顾全部有效记录。</p></header>
    <div className="history-overview" aria-label="历史概览">
      <div><strong>{entries.length}</strong><span> 条记录</span></div>
      <div><strong>{groups.length}</strong><span> 个记录日</span></div>
    </div>
    <section className="unified-history" aria-labelledby="all-records">
      <div className="history-section-heading"><h2 id="all-records">全部记录</h2><span>按时间倒序</span></div>
      {groups.length === 0 ? <div className="empty-state">尚无历史记录。</div> : groups.map((group) => {
        const headingId = `history-day-${group.dateKey}`;
        return <section className="history-day" aria-label={group.label} key={group.dateKey}>
          <h3 id={headingId}><span>{group.label}</span><small>{group.entries.length} 条</small></h3>
          <div className="history-list">{group.entries.map((entry) =>
            <article className={`history-entry history-kind-${entry.kind.toLowerCase()}`} data-kind={entry.kind.toLowerCase()} key={`${entry.kind}-${entry.id}`}>
              <strong>{entry.title}</strong>
              <span className="history-meta">{kindLabels[entry.kind]} · {entry.childName} · {entry.detail}</span>
            </article>)}</div>
        </section>;
      })}
    </section>
  </main>;
}
