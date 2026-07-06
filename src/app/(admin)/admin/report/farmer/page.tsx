import { requirePermission } from "@/lib/rbac";
import { getDistrictsForReport } from "@/server/actions/report";
import { FarmerReportClient } from "./farmer-report-client";

export default async function FarmerReportPage() {
  await requirePermission("report-farmer");
  const districts = await getDistrictsForReport();

  return (
    <div className="p-6 space-y-6">
      <div className="print:hidden">
        <h1 className="text-2xl font-bold">Laporan Petani</h1>
        <p className="text-muted-foreground">Analisis ringkasan dan rincian data petani</p>
      </div>
      <FarmerReportClient districts={districts} />
    </div>
  );
}
