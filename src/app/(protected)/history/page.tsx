import { getPrisma } from "@/lib/db";
import { requireServerSession } from "@/modules/auth/server-session";
import { listHistoryEntries } from "@/modules/history/history-repository";
import { groupHistoryEntries } from "@/modules/history/history-view";

import { SwipeableHistoryEntry } from "./swipeable-history-entry";

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
  const timestamp = (value: Date) => value.toLocaleTimeString("zh-CN", {
    timeZone, hour: "2-digit", minute: "2-digit", hour12: false
  });

  return <main className="profile-shell">
    <header className="profile-header compact"><h1>历史记录</h1><p>按日期回顾全部有效记录。向右滑动记录卡片可进入原始表单修改。</p></header>
    <div className="history-toolbar">
      <strong>{entries.length} 条记录</strong>
    </div>
    <section className="unified-history" aria-labelledby="all-records">
      <h2 id="all-records">全部记录</h2>
      {groups.length === 0 ? <div className="empty-state">尚无历史记录。</div> : groups.map((group) => {
        const headingId = `history-day-${group.dateKey}`;
        return <section className="history-day" aria-labelledby={headingId} key={group.dateKey}>
          <h3 id={headingId}>{group.label}</h3>
          <div className="history-list">{group.entries.map((entry) =>
            <SwipeableHistoryEntry
              href={entry.href}
              category={kindLabels[entry.kind]}
              childName={entry.childName}
              title={entry.title}
              detail={entry.detail}
              time={timestamp(entry.occurredAt)}
              key={`${entry.kind}-${entry.id}`}
            />)}</div>
        </section>;
      })}
    </section>
  </main>;
}
