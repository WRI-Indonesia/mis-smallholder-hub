import { requirePermission } from "@/lib/rbac";
import { HelpHint } from "@/app/(admin)/admin/help/help-hint";
import { getDistrictsForTrainingReport } from "@/server/actions/report";
import { TrainingReportClient } from "./training-report-client";

export default async function TrainingReportPage() {
  await requirePermission("report-training");
  const districts = await getDistrictsForTrainingReport();

  return (
    <div className="p-6 space-y-6">
      <div className="print:hidden">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Laporan Pelatihan</h1>
          <HelpHint menuKey="report-training" />
        </div>
        <p className="text-muted-foreground">Analisis ringkasan sesi pelatihan dan cakupan petani</p>
      </div>
      <TrainingReportClient districts={districts} />
    </div>
  );
}
