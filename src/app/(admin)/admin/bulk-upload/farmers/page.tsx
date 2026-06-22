import { requirePermission, getUserPermissionsForMenu } from "@/lib/rbac";
import { getFarmerGroupsForMapping, getExistingFarmerIds } from "@/server/actions/bulk-upload";
import { BulkUploadClient } from "./bulk-upload-client";

export default async function FarmerBulkUploadPage() {
  await requirePermission("bulk-upload-farmers");
  const permissions = await getUserPermissionsForMenu("bulk-upload-farmers");
  const [farmerGroups, existingFarmerIds] = await Promise.all([
    getFarmerGroupsForMapping(),
    getExistingFarmerIds(),
  ]);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Upload Massal Petani</h2>
          <p className="text-muted-foreground">
            Unggah data petani menggunakan file Excel (.xlsx) atau CSV dengan pencocokan kolom dinamis.
          </p>
        </div>
      </div>
      <BulkUploadClient
        farmerGroups={farmerGroups}
        permissions={permissions}
        existingFarmerIds={existingFarmerIds}
      />
    </div>
  );
}
