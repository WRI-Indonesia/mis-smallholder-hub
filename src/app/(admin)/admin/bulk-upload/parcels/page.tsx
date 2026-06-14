import { requirePermission, getUserPermissionsForMenu } from "@/lib/rbac";
import { getFarmersForMapping, getExistingParcelIds } from "@/server/actions/bulk-upload-parcel";
import { ParcelBulkUploadClient } from "./components/parcel-bulk-upload-client";

export default async function ParcelBulkUploadPage() {
  await requirePermission("bulk-upload-parcels");
  const permissions = await getUserPermissionsForMenu("bulk-upload-parcels");
  const [farmers, existingParcels] = await Promise.all([
    getFarmersForMapping(),
    getExistingParcelIds(),
  ]);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Upload Massal Lahan</h2>
          <p className="text-muted-foreground">
            Unggah data spasial lahan petani menggunakan ZIP Shapefile (.zip berisi berkas .shp, .dbf, .shx, .prj) dengan pencocokan kolom dinamis.
          </p>
        </div>
      </div>
      <ParcelBulkUploadClient
        farmers={farmers}
        existingParcels={existingParcels}
        permissions={permissions}
      />
    </div>
  );
}
