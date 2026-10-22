import Link from "next/link";
import { notFound } from "next/navigation";

import { getPrisma } from "@/lib/db";
import { requireServerSession } from "@/modules/auth/server-session";
import { serializeChild } from "@/modules/children/child-handlers";
import { findChildForHousehold } from "@/modules/children/child-repository";

import { DomainLinks } from "../../_components/domain-links";

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
          <p>出生于 {child.birthDate}。选择下方分类，查看成长图表和记录表格。</p>
        </div>
      </header>
      <DomainLinks childId={child.id} />

    </main>
  );
}
