import { requirePermission, getUserPermissionsForMenu } from "@/lib/rbac";
import { HelpHint } from "@/app/(admin)/admin/help/help-hint";
import { getDistrictsForAnalyst, getFarmerGroupsForAnalyst } from "@/server/actions/data-analyst";
import { FarmerSummaryClient } from "./farmer-summary-client";

export default async function FarmerSummaryPage() {
  await requirePermission("data-analyst-farmer-summary");

  const [districts, farmerGroups, permissions] = await Promise.all([
    getDistrictsForAnalyst(),
    getFarmerGroupsForAnalyst(null),
    getUserPermissionsForMenu("data-analyst-farmer-summary"),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Ringkasan Petani</h1>
          <HelpHint menuKey="data-analyst-farmer-summary" />
        </div>
        <p className="text-muted-foreground">
          Analisis data petani berdasarkan district dan Lembaga Petani
        </p>
      </div>
      <FarmerSummaryClient
        districts={districts}
        initialFarmerGroups={farmerGroups}
        canExport={permissions.includes("EXPORT")}
      />
    </div>
  );
}
