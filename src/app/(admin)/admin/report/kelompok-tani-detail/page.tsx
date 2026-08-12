import { requirePermission, getUserPermissionsForMenu } from "@/lib/rbac";
import { HelpHint } from "@/app/(admin)/admin/help/help-hint";
import { getDistrictsForKtReport } from "@/server/actions/report";
import { KelompokTaniDetailReportClient } from "./kelompok-tani-detail-report-client";

export default async function KelompokTaniDetailReportPage() {
  await requirePermission("report-kelompok-tani-detail");
  const permissions = await getUserPermissionsForMenu("report-kelompok-tani-detail");
  const districts = await getDistrictsForKtReport();

  return (
    <div className="p-6 space-y-6">
      <div className="print:hidden">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Laporan Kelompok Tani (Detail)</h1>
          <HelpHint menuKey="report-kelompok-tani" />
        </div>
        <p className="text-muted-foreground">
          Roster per Lembaga Petani: rincian Kelompok Tani &rarr; daftar Petani (turunan data lahan)
        </p>
      </div>
      <KelompokTaniDetailReportClient
        districts={districts}
        canExport={permissions.includes("EXPORT")}
        canPrint={permissions.includes("PRINT")}
      />
    </div>
  );
}
