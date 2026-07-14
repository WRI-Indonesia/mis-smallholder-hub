import { requirePermission } from "@/lib/rbac";
import { getDistrictsForKtReport } from "@/server/actions/report";
import { KelompokTaniReportClient } from "./kelompok-tani-report-client";

export default async function KelompokTaniReportPage() {
  await requirePermission("report-kelompok-tani");
  const districts = await getDistrictsForKtReport();

  return (
    <div className="p-6 space-y-6">
      <div className="print:hidden">
        <h1 className="text-2xl font-bold">Laporan Kelompok Tani</h1>
        <p className="text-muted-foreground">
          Rekap Gapoktan/KUD &amp; Kelompok Tani turunan dari data lahan (per Lembaga Petani)
        </p>
      </div>
      <KelompokTaniReportClient districts={districts} />
    </div>
  );
}
