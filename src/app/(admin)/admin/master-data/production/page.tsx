import { requirePermission, getUserPermissionsForMenu, isSuperAdmin } from "@/lib/rbac";
import { getProductionRecords } from "@/server/actions/production";
import { getFarmerGroupOptions } from "@/lib/select-options";
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

  const [records, farmerGroups, permissions, superAdmin] = await Promise.all([
    getProductionRecords({
      search: resolvedParams.search,
      farmerGroupId: resolvedParams.farmerGroupId,
      period: resolvedParams.period,
      hasParcel: resolvedParams.hasParcel,
      // SUPERADMIN memuat semua status (filter Status di client, default "Aktif");
      // user lain dibatasi ke aktif oleh action apa pun nilai status ini.
      status: resolvedParams.status ?? "all",
    }),
    getFarmerGroupOptions("master-data-production"),
    getUserPermissionsForMenu("master-data-production"),
    isSuperAdmin(),
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
        isSuperAdmin={superAdmin}
      />
    </div>
  );
}
