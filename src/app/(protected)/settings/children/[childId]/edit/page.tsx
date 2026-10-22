import Link from "next/link";
import { notFound } from "next/navigation";

import { getPrisma } from "@/lib/db";
import { requireServerSession } from "@/modules/auth/server-session";
import { serializeChild } from "@/modules/children/child-handlers";
import { findChildForHousehold } from "@/modules/children/child-repository";

import { ChildProfileForm } from "../../../../children/child-profile-form";

export const dynamic = "force-dynamic";

export default async function EditChildPage({ params }: { params: Promise<{ childId: string }> }) {
  const { childId } = await params;
  const session = await requireServerSession();
  const stored = await findChildForHousehold(getPrisma(), session.householdId, childId);
  if (!stored) notFound();
  const child = serializeChild(stored);

  return (
    <main className="profile-shell">
      <Link className="back-link" href="/settings/children">← 返回儿童与记录管理</Link>
      <header className="profile-header compact">
        <h1>编辑基础资料</h1>
        <p>{child.name} · 这类资料通常只需设置一次，保存后会保留审计记录。</p>
      </header>
      <section className="profile-panel" aria-label="编辑儿童基础资料">
        <ChildProfileForm child={child} />
      </section>
    </main>
  );
}
