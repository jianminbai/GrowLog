import { ChildRecordReport } from "../../../_components/child-record-report";
export const dynamic = "force-dynamic";
export default async function ReportPage({ params }: { params: Promise<{ childId: string }> }) {
  const { childId } = await params;
  return ChildRecordReport({ childId, domain: "growth" });
}
