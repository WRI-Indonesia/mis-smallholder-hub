import { requirePermission, getUserPermissionsForMenu, isSuperAdmin } from "@/lib/rbac";
import { HelpHint } from "@/app/(admin)/admin/help/help-hint";
import { getProductionRecords } from "@/server/actions/production";
import { getFarmerGroupOptions } from "@/lib/select-options";
import { getDistrictsForSelect } from "@/server/actions/farmer-group";
import { ProductionListClient } from "./components/production-list-client";
import {
  hasProductionQuery,
  productionFiltersFromSearchParams,
  type ProductionListSearchParams as SearchParams,
} from "@/lib/production-list-filters";

export default async function ProductionPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requirePermission("master-data-production");

  const resolvedParams = await searchParams;

  const [records, farmerGroups, districts, permissions, superAdmin] = await Promise.all([
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
    getDistrictsForSelect(),
    getUserPermissionsForMenu("master-data-production"),
    isSuperAdmin(),
  ]);

  // #427: saringan server dari query (tautan Kalender Ketersediaan) ditampilkan
  // sebagai nilai awal filter client agar terlihat & bisa di-Reset. `key` me-mount
  // ulang client saat query berubah (Reset/kembali) agar state ikut query baru.
  const { search, farmerGroupId, period, hasParcel, status } = resolvedParams;
  const queryKey = JSON.stringify([search, farmerGroupId, period, hasParcel, status]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Produksi</h1>
          <HelpHint menuKey="master-data-production" />
        </div>
        <p className="text-muted-foreground">
          Data panen dan produksi hasil tani (yield) per petani
        </p>
      </div>
      <ProductionListClient
        key={queryKey}
        initialRecords={records}
        initialFilters={productionFiltersFromSearchParams(resolvedParams, farmerGroups)}
        hasServerQuery={hasProductionQuery(resolvedParams)}
        farmerGroups={farmerGroups}
        districts={districts}
        permissions={permissions}
        isSuperAdmin={superAdmin}
      />
    </div>
  );
}
