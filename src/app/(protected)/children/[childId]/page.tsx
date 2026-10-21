import Link from "next/link";
import { notFound } from "next/navigation";

import { getPrisma } from "@/lib/db";
import { requireServerSession } from "@/modules/auth/server-session";
import { serializeChild } from "@/modules/children/child-handlers";
import { findChildForHousehold } from "@/modules/children/child-repository";

import { ChildProfileForm } from "../child-profile-form";

export const dynamic = "force-dynamic";

export default async function ChildPage({ params }: { params: Promise<{ childId: string }> }) {
  const { childId } = await params;
  const session = await requireServerSession();
  const stored = await findChildForHousehold(getPrisma(), session.householdId, childId);
  if (!stored) notFound();
  const child = serializeChild(stored);

  return (
    <main className="profile-shell">
      <Link className="back-link" href="/children">← 返回儿童档案</Link>
      <header className="profile-header compact">
        <div>
          <span className="eyebrow">Profile</span>
          <h1>{child.name}</h1>
          <p>出生于 {child.birthDate}。在这里修正基础资料，修改会写入审计记录。</p>
        </div>
      </header>
      <Link className="primary-action inline-action" href={`/children/${child.id}/growth`}>查看身高体重记录</Link>
      <Link className="primary-action inline-action secondary-link" href={`/children/${child.id}/sleep`}>查看睡眠记录</Link>
      <Link className="primary-action inline-action secondary-link" href={`/children/${child.id}/nutrition`}>查看饮食记录</Link>
      <section className="profile-panel" aria-labelledby="edit-profile">
        <div className="section-heading">
          <div>
            <span>Edit profile</span>
            <h2 id="edit-profile">编辑基础资料</h2>
          </div>
        </div>
        <ChildProfileForm child={child} />
      </section>
    </main>
  );
}
