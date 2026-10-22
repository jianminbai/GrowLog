import Link from "next/link";
import { notFound } from "next/navigation";

import { getPrisma } from "@/lib/db";
import { requireServerSession } from "@/modules/auth/server-session";
import { serializeChild } from "@/modules/children/child-handlers";
import { findChildForHousehold } from "@/modules/children/child-repository";

import { DomainLinks } from "../../_components/domain-links";
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
          <h1>{child.name}</h1>
          <p>出生于 {child.birthDate}。在这里修正基础资料，修改会写入审计记录。</p>
        </div>
      </header>
      <DomainLinks childId={child.id} />
      <section className="profile-panel" aria-labelledby="edit-profile">
        <div className="section-heading">
          <h2 id="edit-profile">编辑基础资料</h2>
        </div>
        <ChildProfileForm child={child} />
      </section>
    </main>
  );
}
