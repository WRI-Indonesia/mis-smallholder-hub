import { requirePermission, hasPermission } from "@/lib/rbac";
import { HelpHint } from "@/app/(admin)/admin/help/help-hint";
import { getBenchmarkComparisonView } from "@/server/actions/benchmark-comparison";
import { BenchmarkComparisonClient } from "./benchmark-comparison-client";

export default async function BenchmarkComparisonPage() {
  await requirePermission("data-analyst-benchmark-comparison");

  const [view, canEdit, canExport] = await Promise.all([
    getBenchmarkComparisonView(),
    hasPermission("data-analyst-benchmark-comparison", "EDIT"),
    hasPermission("data-analyst-benchmark-comparison", "EXPORT"),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Komparasi Data Acuan</h1>
          <HelpHint menuKey="data-analyst-benchmark-comparison" />
        </div>
        <p className="text-muted-foreground">
          Bandingkan angka acuan manual (GDrive / MD 1st SOW) dengan data MIS live per Lembaga
          Petani — selisih = acuan − MIS
        </p>
      </div>
      <BenchmarkComparisonClient view={view} canEdit={canEdit} canExport={canExport} />
    </div>
  );
}
