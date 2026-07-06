import { requirePermission } from "@/lib/rbac";
import { getDistrictsForTrainingReport } from "@/server/actions/report";
import { TrainingReportClient } from "./training-report-client";

export default async function TrainingReportPage() {
  await requirePermission("report-training");
  const districts = await getDistrictsForTrainingReport();

  return (
    <div className="p-6 space-y-6">
      <div className="print:hidden">
        <h1 className="text-2xl font-bold">Laporan Pelatihan</h1>
        <p className="text-muted-foreground">Analisis ringkasan kegiatan pelatihan dan cakupan petani</p>
      </div>
      <TrainingReportClient districts={districts} />
    </div>
  );
}
