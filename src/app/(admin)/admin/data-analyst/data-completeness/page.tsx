import { requirePermission } from "@/lib/rbac";
import { HelpHint } from "@/app/(admin)/admin/help/help-hint";
import { getDistrictsForCompleteness, getFarmerGroupsForCompleteness } from "@/server/actions/data-completeness";
import { DataCompletenessClient } from "./data-completeness-client";

export default async function DataCompletenessPage() {
  await requirePermission("data-analyst-data-completeness");

  const [districts, farmerGroups] = await Promise.all([
    getDistrictsForCompleteness(),
    getFarmerGroupsForCompleteness(null),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Analisa Ketersediaan Data</h1>
          <HelpHint menuKey="data-analyst-data-completeness" />
        </div>
        <p className="text-muted-foreground">
          Periksa kelengkapan dan anomali data satu Lembaga Petani (Petani, Lahan, Pelatihan, Produksi)
        </p>
      </div>
      <DataCompletenessClient districts={districts} initialFarmerGroups={farmerGroups} />
    </div>
  );
}
