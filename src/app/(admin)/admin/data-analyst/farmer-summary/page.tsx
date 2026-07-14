import { requirePermission } from "@/lib/rbac";
import { getDistrictsForAnalyst, getFarmerGroupsForAnalyst } from "@/server/actions/data-analyst";
import { FarmerSummaryClient } from "./farmer-summary-client";

export default async function FarmerSummaryPage() {
  await requirePermission("data-analyst-farmer-summary");

  const [districts, farmerGroups] = await Promise.all([
    getDistrictsForAnalyst(),
    getFarmerGroupsForAnalyst(null),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ringkasan Petani</h1>
        <p className="text-muted-foreground">
          Analisis data petani berdasarkan district dan Lembaga Petani
        </p>
      </div>
      <FarmerSummaryClient districts={districts} initialFarmerGroups={farmerGroups} />
    </div>
  );
}
