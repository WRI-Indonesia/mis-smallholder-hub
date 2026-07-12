import { requirePermission, getUserPermissionsForMenu, isSuperAdmin } from "@/lib/rbac";
import { getFarmerGroups, getDistrictsForSelect } from "@/server/actions/farmer-group";
import { GroupListClient } from "./group-list-client";

export default async function GroupsPage() {
  await requirePermission("master-data-groups");
  const [groups, districts, permissions, superAdmin] = await Promise.all([
    getFarmerGroups(),
    getDistrictsForSelect(),
    getUserPermissionsForMenu("master-data-groups"),
    isSuperAdmin(),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Kelompok Tani</h1>
        <p className="text-muted-foreground">Data kelompok tani yang terdaftar</p>
      </div>
      <GroupListClient initialGroups={groups} districts={districts} permissions={permissions} isSuperAdmin={superAdmin} />
    </div>
  );
}
