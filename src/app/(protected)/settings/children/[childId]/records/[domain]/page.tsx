import { notFound } from "next/navigation";
import { requireServerSession } from "@/modules/auth/server-session";
import GrowthEditor from "../../../../../children/[childId]/growth/manage-records";
import SleepEditor from "../../../../../children/[childId]/sleep/manage-records";
import NutritionEditor from "../../../../../children/[childId]/nutrition/manage-records";
import ActivityEditor from "../../../../../children/[childId]/activity/manage-records";
import EmotionEditor from "../../../../../children/[childId]/emotion/manage-records";
const editors = { growth: GrowthEditor, sleep: SleepEditor, nutrition: NutritionEditor, activity: ActivityEditor, emotion: EmotionEditor };
export const dynamic = "force-dynamic";
export default async function RecordEditorPage({ params }: { params: Promise<{ childId: string; domain: string }> }) {
  await requireServerSession();
  const { childId, domain } = await params;
  if (!Object.hasOwn(editors, domain)) notFound();
  return editors[domain as keyof typeof editors]({ params: Promise.resolve({ childId }) });
}
