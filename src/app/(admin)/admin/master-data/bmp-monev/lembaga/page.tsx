import { requirePermission, getUserPermissionsForMenu } from "@/lib/rbac";
import { HelpHint } from "@/app/(admin)/admin/help/help-hint";
import { getFarmerGroupOptions } from "@/lib/select-options";
import { getBmpGroupAssessments, getBmpIndicators } from "@/server/actions/bmp-assessment-detail";
import { BmpGroupAssessmentClient } from "./bmp-group-assessment-client";

/** Penilaian Lembaga Monev BMP (#346): 14 indikator level LEMBAGA per Lembaga per tahun. Izin menumpang menu Monev BMP. */
export default async function BmpGroupAssessmentPage() {
  await requirePermission("master-data-bmp-monev");
  const [rows, indicators, farmerGroups, permissions] = await Promise.all([
    getBmpGroupAssessments(),
    getBmpIndicators(),
    getFarmerGroupOptions("master-data-bmp-monev"),
    getUserPermissionsForMenu("master-data-bmp-monev"),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Penilaian Lembaga — Monev BMP</h1>
          <HelpHint menuKey="master-data-bmp-monev" />
        </div>
        <p className="text-muted-foreground">
          Skor 14 indikator level Lembaga per tahun survei (standar teknis kerja, unit manajemen, LSU/SSU, infrastruktur panen, OER, single DO, taksasi, catatan
          produksi, …). Enam di antaranya ikut menentukan skor akhir setiap petani Lembaga itu.
        </p>
      </div>
      <BmpGroupAssessmentClient rows={rows} indicators={indicators.filter((i) => i.level === "LEMBAGA")} farmerGroups={farmerGroups} permissions={permissions} />
    </div>
  );
}
