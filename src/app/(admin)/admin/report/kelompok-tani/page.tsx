import { requirePermission, getUserPermissionsForMenu } from "@/lib/rbac";
import { HelpHint } from "@/app/(admin)/admin/help/help-hint";
import { getDistrictsForKtReport } from "@/server/actions/report";
import { KelompokTaniReportClient } from "./kelompok-tani-report-client";

export default async function KelompokTaniReportPage() {
  await requirePermission("report-kelompok-tani");
  const permissions = await getUserPermissionsForMenu("report-kelompok-tani");
  const districts = await getDistrictsForKtReport();

  return (
    <div className="p-6 space-y-6">
      <div className="print:hidden">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Laporan Kelompok Tani (Ringkasan)</h1>
          <HelpHint menuKey="report-kelompok-tani" />
        </div>
        <p className="text-muted-foreground">
          Rekap Kelompok Tani turunan dari data lahan (per Lembaga Petani)
        </p>
      </div>
      <KelompokTaniReportClient
        districts={districts}
        canExport={permissions.includes("EXPORT")}
        canPrint={permissions.includes("PRINT")}
      />
    </div>
  );
}
