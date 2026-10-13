import { requirePermission, getUserPermissionsForMenu, isSuperAdmin } from "@/lib/rbac";
import { HelpHint } from "@/app/(admin)/admin/help/help-hint";
import { getProductionRecords } from "@/server/actions/production";
import { getFarmerGroupOptions } from "@/lib/select-options";
import { getDistrictsForSelect } from "@/server/actions/farmer-group";
import { ProductionListClient } from "./components/production-list-client";
import {
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
    // Selalu data penuh (#427): query URL hanya nilai awal filter client, agar
    // filter yang tampil bisa dilonggarkan dan di-Reset tanpa saringan server
    // tersembunyi. SUPERADMIN memuat semua status (filter Status di client,
    // default "Aktif"); user lain dibatasi ke aktif oleh action.
    getProductionRecords({ status: "all" }),
    getFarmerGroupOptions("master-data-production"),
    getDistrictsForSelect(),
    getUserPermissionsForMenu("master-data-production"),
    isSuperAdmin(),
  ]);

  // #427: query (tautan Kalender Ketersediaan) = nilai awal filter client. `key`
  // me-mount ulang client saat query berubah (tombol kembali / tautan lain).
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
        farmerGroups={farmerGroups}
        districts={districts}
        permissions={permissions}
        isSuperAdmin={superAdmin}
      />
    </div>
  );
}
