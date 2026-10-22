import Link from "next/link";
import { requireServerSession } from "@/modules/auth/server-session";
import { ChildProfileForm } from "../../../children/child-profile-form";
export default async function NewChildPage() {
  await requireServerSession();
  return <main className="profile-shell">
    <Link className="back-link" href="/settings/children">← 返回儿童与记录管理</Link>
    <header className="profile-header compact"><h1>添加孩子</h1><p>建立基础资料，之后即可查看和记录孩子的成长。</p></header>
    <section className="profile-panel"><ChildProfileForm /></section>
  </main>;
}
