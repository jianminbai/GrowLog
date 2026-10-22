import Link from "next/link";

import { getPrisma } from "@/lib/db";
import { requireServerSession } from "@/modules/auth/server-session";
import { serializeChild } from "@/modules/children/child-handlers";
import { listChildrenForHousehold } from "@/modules/children/child-repository";



export const dynamic = "force-dynamic";

export default async function ChildrenPage() {
  const session = await requireServerSession();
  const children = (await listChildrenForHousehold(getPrisma(), session.householdId)).map(serializeChild);

  return (
    <main className="profile-shell">
      <header className="profile-header">
        <div>
          <h1>儿童档案</h1>
          <p>基础资料只需填写一次，之后每条成长记录都会归入相应档案。</p>
        </div>
      </header>

      {children.length > 0 ? (
        <section className="profile-list" aria-labelledby="saved-profiles">
          <h2 id="saved-profiles">已有档案</h2>
          <div className="profile-cards">
            {children.map((child) => (
              <Link className="profile-card" href={`/children/${child.id}`} key={child.id}>
                <strong>{child.name}</strong>
                <span>出生于 {child.birthDate}</span>
                <span>查看成长趋势 →</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {children.length === 0 ? <section className="empty-state profile-panel">
        <p>还没有孩子的档案。添加孩子后，即可查看成长趋势与历史数据。</p>
        <Link className="primary-action" href="/settings/children/new">添加孩子</Link>
      </section> : null}
    </main>
  );
}
