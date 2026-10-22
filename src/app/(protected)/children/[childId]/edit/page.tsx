import { redirect } from "next/navigation";
import { requireServerSession } from "@/modules/auth/server-session";
export default async function LegacyEditChildPage({ params }: { params: Promise<{ childId: string }> }) {
  await requireServerSession();
  const { childId } = await params;
  redirect(`/settings/children/${encodeURIComponent(childId)}/edit`);
}
