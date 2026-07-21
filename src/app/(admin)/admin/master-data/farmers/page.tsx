import { requirePermission, getUserPermissionsForMenu, isSuperAdmin } from "@/lib/rbac";
import { HelpHint } from "@/app/(admin)/admin/help/help-hint";
import { getFarmers } from "@/server/actions/farmer";
import { getFarmerGroupOptions } from "@/lib/select-options";
import { getDistrictsForSelect } from "@/server/actions/farmer-group";
import { FarmerListClient } from "./farmer-list-client";

export default async function FarmersPage() {
  await requirePermission("master-data-farmers");
  const [farmers, farmerGroups, districts, permissions, superAdmin] = await Promise.all([
    getFarmers(),
    getFarmerGroupOptions("master-data-farmers"),
    getDistrictsForSelect(),
    getUserPermissionsForMenu("master-data-farmers"),
    isSuperAdmin(),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Petani</h1>
          <HelpHint menuKey="master-data-farmers" />
        </div>
        <p className="text-muted-foreground">Data petani (smallholder) yang terdaftar</p>
      </div>
      <FarmerListClient
        initialFarmers={farmers}
        farmerGroups={farmerGroups}
        districts={districts}
        permissions={permissions}
        isSuperAdmin={superAdmin}
      />
    </div>
  );
}
