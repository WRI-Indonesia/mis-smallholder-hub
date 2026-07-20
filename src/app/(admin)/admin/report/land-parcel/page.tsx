import { requirePermission } from "@/lib/rbac";
import { getDistrictsForLandParcelReport } from "@/server/actions/report";
import { LandParcelReportClient } from "./land-parcel-report-client";

export default async function LandParcelReportPage() {
  await requirePermission("report-land-parcel");
  const districts = await getDistrictsForLandParcelReport();

  return (
    <div className="p-6 space-y-6">
      <div className="print:hidden">
        <h1 className="text-2xl font-bold">Laporan Lahan</h1>
        <p className="text-muted-foreground">
          Roster lahan per Lembaga Petani (Lembaga, Petani, ID Petani, ID Lahan, Kelompok Tani)
        </p>
      </div>
      <LandParcelReportClient districts={districts} />
    </div>
  );
}
