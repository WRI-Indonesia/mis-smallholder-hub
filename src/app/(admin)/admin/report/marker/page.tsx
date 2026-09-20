import { requirePermission, getUserPermissionsForMenu } from "@/lib/rbac";
import { HelpHint } from "@/app/(admin)/admin/help/help-hint";
import { getDistrictsForMarkerReport } from "@/server/actions/report";
import { MarkerReportClient } from "./marker-report-client";

/**
 * Report › Patok (#331, menu baru `report-marker` — keputusan owner 2026-09-14):
 * seluruh patok batas pada Distrik/Lembaga terpilih — KPI kondisi, tabel satu
 * baris per patok fisik, unduhan Excel/spasial/PDF memakai helper yang sama
 * dengan baris legenda Peta Lahan.
 */
export default async function MarkerReportPage() {
  await requirePermission("report-marker");
  const permissions = await getUserPermissionsForMenu("report-marker");
  const districts = await getDistrictsForMarkerReport();

  return (
    <div className="p-6 space-y-6">
      <div className="print:hidden">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Laporan Patok</h1>
          <HelpHint menuKey="report-marker" />
        </div>
        <p className="text-muted-foreground">
          Patok batas lahan per Distrik/Lembaga Petani — kondisi, bahan, lahan pemakai; satu baris per patok fisik
        </p>
      </div>
      <MarkerReportClient
        districts={districts.map((d) => ({ id: d.id, name: d.name }))}
        canExport={permissions.includes("EXPORT")}
        canPrint={permissions.includes("PRINT")}
      />
    </div>
  );
}
