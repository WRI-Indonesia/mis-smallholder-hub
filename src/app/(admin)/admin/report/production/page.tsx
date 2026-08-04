import { requirePermission } from "@/lib/rbac";
import { HelpHint } from "@/app/(admin)/admin/help/help-hint";
import { getDistrictsForProductionReport } from "@/server/actions/report";
import { ProductionReportClient } from "./production-report-client";

export default async function ProductionReportPage() {
  await requirePermission("report-production");
  const districts = await getDistrictsForProductionReport();

  return (
    <div className="p-6 space-y-6">
      <div className="print:hidden">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Laporan Produksi</h1>
          <HelpHint menuKey="report-production" />
        </div>
        <p className="text-muted-foreground">Matriks produksi bulanan per petani/lahan dalam satu Lembaga Petani</p>
      </div>
      <ProductionReportClient districts={districts} />
    </div>
  );
}
