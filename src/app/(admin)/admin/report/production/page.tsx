import { requirePermission } from "@/lib/rbac";
import { getDistrictsForProductionReport } from "@/server/actions/report";
import { ProductionReportClient } from "./production-report-client";

export default async function ProductionReportPage() {
  await requirePermission("report-production");
  const districts = await getDistrictsForProductionReport();

  return (
    <div className="p-6 space-y-6">
      <div className="print:hidden">
        <h1 className="text-2xl font-bold">Laporan Produksi</h1>
        <p className="text-muted-foreground">Matriks produksi bulanan per petani/lahan dalam satu Kelompok Tani</p>
      </div>
      <ProductionReportClient districts={districts} />
    </div>
  );
}
