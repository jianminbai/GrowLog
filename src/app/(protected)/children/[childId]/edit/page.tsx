import Link from "next/link";
import { notFound } from "next/navigation";

import { getPrisma } from "@/lib/db";
import { requireServerSession } from "@/modules/auth/server-session";
import { serializeChild } from "@/modules/children/child-handlers";
import { findChildForHousehold } from "@/modules/children/child-repository";

import { ChildProfileForm } from "../../child-profile-form";

export const dynamic = "force-dynamic";

export default async function EditChildPage({ params }: { params: Promise<{ childId: string }> }) {
  const { childId } = await params;
  const session = await requireServerSession();
  const stored = await findChildForHousehold(getPrisma(), session.householdId, childId);
  if (!stored) notFound();
  const child = serializeChild(stored);

  return (
    <main className="profile-shell">
      <Link className="back-link" href={`/children/${child.id}`}>← 返回{child.name}档案</Link>
      <header className="profile-header compact">
        <h1>编辑基础资料</h1>
        <p>这类资料通常只需设置一次。保存修改后会返回档案页，并在审计记录中保留本次变更。</p>
      </header>
      <section className="profile-panel" aria-label="编辑儿童基础资料">
        <ChildProfileForm child={child} />
      </section>
    </main>
  );
}
