import { requirePermission, getUserPermissionsForMenu } from "@/lib/rbac";
import { getProductionRecords } from "@/server/actions/production";
import { getFarmerGroupsForSelect } from "@/server/actions/farmer";
import { ProductionListClient } from "./components/production-list-client";

interface SearchParams {
  search?: string;
  farmerGroupId?: string;
  period?: string;
  hasParcel?: string;
  status?: string;
}

export default async function ProductionPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requirePermission("master-data-production");

  const resolvedParams = await searchParams;

  const [records, farmerGroups, permissions] = await Promise.all([
    getProductionRecords({
      search: resolvedParams.search,
      farmerGroupId: resolvedParams.farmerGroupId,
      period: resolvedParams.period,
      hasParcel: resolvedParams.hasParcel,
      status: resolvedParams.status,
    }),
    getFarmerGroupsForSelect(),
    getUserPermissionsForMenu("master-data-production"),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Produksi</h1>
        <p className="text-muted-foreground">Data panen dan produksi hasil tani (yield) per petani</p>
      </div>
      <ProductionListClient
        initialRecords={records}
        farmerGroups={farmerGroups}
        permissions={permissions}
      />
    </div>
  );
}
