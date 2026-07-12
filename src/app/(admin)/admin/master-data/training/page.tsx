import { requirePermission, getUserPermissionsForMenu, isSuperAdmin } from "@/lib/rbac";
import { getTrainingActivities, getTrainingPackagesForSelect, getFarmerGroupsForSelect } from "@/server/actions/training";
import { getDistrictsForSelect } from "@/server/actions/farmer-group";
import { TrainingListClient } from "./training-list-client";

export default async function TrainingPage() {
  await requirePermission("master-data-training");
  const [activities, packages, farmerGroups, districts, permissions, superAdmin] = await Promise.all([
    getTrainingActivities(),
    getTrainingPackagesForSelect(),
    getFarmerGroupsForSelect(),
    getDistrictsForSelect(),
    getUserPermissionsForMenu("master-data-training"),
    isSuperAdmin(),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pelatihan</h1>
        <p className="text-muted-foreground">Data kegiatan pelatihan kelompok tani yang terdaftar</p>
      </div>
      <TrainingListClient
        initialActivities={activities}
        packages={packages}
        farmerGroups={farmerGroups}
        districts={districts}
        permissions={permissions}
        isSuperAdmin={superAdmin}
      />
    </div>
  );
}
