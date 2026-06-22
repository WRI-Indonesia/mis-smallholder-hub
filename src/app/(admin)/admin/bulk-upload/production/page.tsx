import { requirePermission, getUserPermissionsForMenu } from "@/lib/rbac";
import { getFarmersForProductionMapping, getExistingProductionRecords } from "@/server/actions/bulk-upload-production";
import { BulkUploadProductionClient } from "./bulk-upload-production-client";

export default async function ProductionBulkUploadPage() {
  await requirePermission("bulk-upload-production");
  const permissions = await getUserPermissionsForMenu("bulk-upload-production");
  
  const [farmers, existingRecords] = await Promise.all([
    getFarmersForProductionMapping(),
    getExistingProductionRecords(),
  ]);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Upload Massal Produksi</h2>
          <p className="text-muted-foreground">
            Unggah data produksi petani menggunakan file Excel (.xlsx) atau CSV dengan pencocokan kolom dinamis.
          </p>
        </div>
      </div>
      <BulkUploadProductionClient
        farmers={farmers}
        permissions={permissions}
        existingRecords={existingRecords}
      />
    </div>
  );
}
