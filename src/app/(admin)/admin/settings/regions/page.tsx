import { requirePermission, getUserPermissionsForMenu } from "@/lib/rbac";
import { getRegionTree } from "@/server/actions/region";
import { RegionListClient } from "./region-list-client";

export default async function RegionsPage() {
  await requirePermission("settings-regions");
  const [data, permissions] = await Promise.all([
    getRegionTree(),
    getUserPermissionsForMenu("settings-regions"),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Region Management</h1>
        <p className="text-muted-foreground">Kelola hierarki wilayah administratif</p>
      </div>
      <RegionListClient initialData={data} permissions={permissions} />
    </div>
  );
}
