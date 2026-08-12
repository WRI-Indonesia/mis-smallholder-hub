import { requirePermission, getUserPermissionsForMenu } from "@/lib/rbac";
import { HelpHint } from "@/app/(admin)/admin/help/help-hint";
import { getDistrictsForReport } from "@/server/actions/report";
import { FarmerReportClient } from "./farmer-report-client";

export default async function FarmerReportPage() {
  await requirePermission("report-farmer");
  const permissions = await getUserPermissionsForMenu("report-farmer");
  const districts = await getDistrictsForReport();

  return (
    <div className="p-6 space-y-6">
      <div className="print:hidden">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Laporan Petani</h1>
          <HelpHint menuKey="report-farmer" />
        </div>
        <p className="text-muted-foreground">Analisis ringkasan dan rincian data petani</p>
      </div>
      <FarmerReportClient
        districts={districts}
        canExport={permissions.includes("EXPORT")}
        canPrint={permissions.includes("PRINT")}
      />
    </div>
  );
}
