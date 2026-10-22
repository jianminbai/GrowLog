import Link from "next/link";
import { getPrisma } from "@/lib/db";
import { requireServerSession } from "@/modules/auth/server-session";
import { listChildrenForHousehold } from "@/modules/children/child-repository";
import { recordDomains } from "@/modules/reports/record-domains";
export const dynamic = "force-dynamic";
export default async function ManageChildrenPage() {
  const auth = await requireServerSession();
  const children = await listChildrenForHousehold(getPrisma(), auth.householdId);
  return <main className="profile-shell">
    <Link className="back-link" href="/settings">← 返回设置</Link>
    <header className="profile-header compact"><h1>儿童与记录管理</h1><p>添加孩子、修改基础资料，或录入和维护成长记录。</p></header>
    <Link className="primary-action" href="/settings/children/new">添加孩子</Link>
    {children.length === 0 ? <p className="empty-state">暂无儿童档案，请先添加孩子。</p> : children.map(child =>
      <section className="profile-panel" key={child.id} aria-label={`${child.name} 的管理入口`}>
        <h2>{child.name}</h2>
        <div className="settings-management-links">
          <Link href={`/settings/children/${child.id}/edit`}>基础资料</Link>
          {recordDomains.map(domain => <Link key={domain.route} href={`/settings/children/${child.id}/records/${domain.route}`}>{domain.label} · 录入与修改</Link>)}
        </div>
      </section>)}
  </main>;
}
