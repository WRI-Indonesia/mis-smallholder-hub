import { requirePermission, getUserPermissionsForMenu, isSuperAdmin } from "@/lib/rbac";
import { HelpHint } from "@/app/(admin)/admin/help/help-hint";
import { getTrainingActivities, getTrainingPackagesForSelect } from "@/server/actions/training";
import { getFarmerGroupOptions } from "@/lib/select-options";
import { getDistrictsForSelect } from "@/server/actions/farmer-group";
import { TrainingListClient } from "./training-list-client";

export default async function TrainingPage() {
  await requirePermission("master-data-training");
  const [activities, packages, farmerGroups, districts, permissions, superAdmin] =
    await Promise.all([
      getTrainingActivities(),
      getTrainingPackagesForSelect(),
      getFarmerGroupOptions("master-data-training"),
      getDistrictsForSelect(),
      getUserPermissionsForMenu("master-data-training"),
      isSuperAdmin(),
    ]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Pelatihan</h1>
          <HelpHint menuKey="master-data-training" />
        </div>
        <p className="text-muted-foreground">Data kegiatan pelatihan lembaga tani yang terdaftar</p>
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
