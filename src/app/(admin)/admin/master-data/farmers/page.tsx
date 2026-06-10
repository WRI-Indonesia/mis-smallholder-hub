import { requirePermission } from "@/lib/rbac";
import { getUserPermissionsForMenu } from "@/lib/rbac";
import { getFarmers, getFarmerGroupsForSelect } from "@/server/actions/farmer";
import { getDistrictsForSelect } from "@/server/actions/farmer-group";
import { FarmerListClient } from "./farmer-list-client";

export default async function FarmersPage() {
  await requirePermission("master-data-farmers");
  const [farmers, farmerGroups, districts, permissions] = await Promise.all([
    getFarmers(),
    getFarmerGroupsForSelect(),
    getDistrictsForSelect(),
    getUserPermissionsForMenu("master-data-farmers"),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Petani</h1>
        <p className="text-muted-foreground">Data petani (smallholder) yang terdaftar</p>
      </div>
      <FarmerListClient
        initialFarmers={farmers}
        farmerGroups={farmerGroups}
        districts={districts}
        permissions={permissions}
      />
    </div>
  );
}
