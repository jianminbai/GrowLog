import Link from "next/link";

import { getPrisma } from "@/lib/db";
import { requireServerSession } from "@/modules/auth/server-session";
import { listChildrenForHousehold } from "@/modules/children/child-repository";

import { DocumentManager } from "./document-manager";

export const dynamic = "force-dynamic";

export default async function KindergartenDocumentsPage() {
  const session = await requireServerSession();
  const children = await listChildrenForHousehold(getPrisma(), session.householdId);

  return <main className="profile-shell document-settings-shell">
    <Link className="back-link" href="/settings">← 返回设置</Link>
    <header className="profile-header compact">
      <h1>幼儿园资料</h1>
      <p>按日期保存每日保教单，按周保存菜单；重复上传同一日期或同一周会替换原图。</p>
    </header>
    {children.length === 0 ? <section className="profile-panel document-empty-state">
      <h2>先建立儿童档案</h2>
      <p>资料需要关联到具体孩子，添加档案后即可上传。</p>
      <Link className="primary-action" href="/settings/children/new">添加孩子</Link>
    </section> : <DocumentManager childOptions={children.map(({ id, name }) => ({ id, name }))} />}
  </main>;
}
