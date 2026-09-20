import { requirePermission, getUserPermissionsForMenu } from "@/lib/rbac";
import { notFound } from "next/navigation";
import { getBmpAssessmentDetailView } from "@/server/actions/bmp-assessment-detail";
import { BmpAssessmentDetailClient } from "./bmp-assessment-detail-client";

/** Detail satu penilaian Monev BMP (#346): raport 5 kegiatan + 30 indikator + penilaian Lembaga tahun itu. */
export default async function BmpAssessmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("master-data-bmp-monev");
  const { id } = await params;
  const [view, permissions] = await Promise.all([getBmpAssessmentDetailView(id), getUserPermissionsForMenu("master-data-bmp-monev")]);
  if (!view) notFound();

  return (
    <div className="p-6 space-y-6">
      <BmpAssessmentDetailClient view={view} permissions={permissions} />
    </div>
  );
}
