import Link from "next/link";
import { notFound } from "next/navigation";

import { getPrisma } from "@/lib/db";
import { requireServerSession } from "@/modules/auth/server-session";
import { serializeChild } from "@/modules/children/child-handlers";
import { findChildForHousehold } from "@/modules/children/child-repository";

import { DomainLinks } from "../../_components/domain-links";

export const dynamic = "force-dynamic";

const sexLabels = { FEMALE: "女", MALE: "男", UNSPECIFIED: "未填写" } as const;

function measurement(value: number | null, unit: string) {
  return value === null ? "未填写" : `${value} ${unit}`;
}

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
          <p>出生于 {child.birthDate}。选择下方分类，查看或补充成长记录。</p>
        </div>
      </header>
      <DomainLinks childId={child.id} />
      <section className="profile-panel profile-summary-panel" aria-labelledby="profile-summary">
        <div className="section-heading">
          <h2 id="profile-summary">基础资料</h2>
          <Link className="profile-edit-link" href={`/children/${child.id}/edit`}>编辑基础资料</Link>
        </div>
        <dl className="profile-summary-grid">
          <div><dt>出生日期</dt><dd>{child.birthDate}</dd></div>
          <div><dt>生理性别</dt><dd>{sexLabels[child.sex]}</dd></div>
          <div><dt>出生身高</dt><dd>{measurement(child.birthHeightCm, "cm")}</dd></div>
          <div><dt>出生体重</dt><dd>{measurement(child.birthWeightKg, "kg")}</dd></div>
          <div><dt>母亲身高</dt><dd>{measurement(child.motherHeightCm, "cm")}</dd></div>
          <div><dt>父亲身高</dt><dd>{measurement(child.fatherHeightCm, "cm")}</dd></div>
          <div className="profile-summary-notes"><dt>备注</dt><dd>{child.notes || "未填写"}</dd></div>
        </dl>
      </section>
    </main>
  );
}
