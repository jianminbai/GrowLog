import Link from "next/link";

import { getPrisma } from "@/lib/db";
import { requireServerSession } from "@/modules/auth/server-session";
import { serializeChild } from "@/modules/children/child-handlers";
import { listChildrenForHousehold } from "@/modules/children/child-repository";

import { ChildProfileForm } from "./child-profile-form";

export const dynamic = "force-dynamic";

export default async function ChildrenPage() {
  const session = await requireServerSession();
  const children = (await listChildrenForHousehold(getPrisma(), session.householdId)).map(serializeChild);

  return (
    <main className="profile-shell">
      <header className="profile-header">
        <div>
          <span className="eyebrow">Child profiles</span>
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
                <span>查看与编辑 →</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="profile-panel" aria-labelledby="new-profile">
        <div className="section-heading">
          <div>
            <span>New profile</span>
            <h2 id="new-profile">建立儿童档案</h2>
          </div>
        </div>
        <ChildProfileForm />
      </section>
    </main>
  );
}
