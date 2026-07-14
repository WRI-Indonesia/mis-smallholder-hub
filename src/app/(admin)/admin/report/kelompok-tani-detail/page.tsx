import { requirePermission } from "@/lib/rbac";
import { getDistrictsForKtReport } from "@/server/actions/report";
import { KelompokTaniDetailReportClient } from "./kelompok-tani-detail-report-client";

export default async function KelompokTaniDetailReportPage() {
  await requirePermission("report-kelompok-tani-detail");
  const districts = await getDistrictsForKtReport();

  return (
    <div className="p-6 space-y-6">
      <div className="print:hidden">
        <h1 className="text-2xl font-bold">Laporan Kelompok Tani (Detail)</h1>
        <p className="text-muted-foreground">
          Roster per Lembaga Petani: rincian Gapoktan/KUD &rarr; Kelompok Tani &rarr; daftar Petani (turunan data lahan)
        </p>
      </div>
      <KelompokTaniDetailReportClient districts={districts} />
    </div>
  );
}
