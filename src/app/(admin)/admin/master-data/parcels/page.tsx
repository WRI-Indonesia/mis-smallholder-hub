import { requirePermission, getUserPermissionsForMenu, isSuperAdmin } from "@/lib/rbac";
import { getLandParcels, getFarmersForSelect, getFarmerGroupsForSelect } from "@/server/actions/land-parcel";
import { ParcelListClient } from "./components/parcel-list-client";

export default async function ParcelsPage() {
  await requirePermission("master-data-parcels");

  const [parcels, farmers, farmerGroups, permissions, superAdmin] = await Promise.all([
    getLandParcels(),
    getFarmersForSelect(),
    getFarmerGroupsForSelect(),
    getUserPermissionsForMenu("master-data-parcels"),
    isSuperAdmin(),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Lahan</h1>
        <p className="text-muted-foreground">Data lahan petani (land parcels) yang terdaftar</p>
      </div>
      <ParcelListClient
        initialParcels={parcels}
        farmers={farmers}
        farmerGroups={farmerGroups}
        permissions={permissions}
        isSuperAdmin={superAdmin}
      />
    </div>
  );
}
