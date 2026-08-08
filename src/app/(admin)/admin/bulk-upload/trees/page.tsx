import { requirePermission, getUserPermissionsForMenu } from "@/lib/rbac";
import { HelpHint } from "@/app/(admin)/admin/help/help-hint";
import { getTreeUploadParcels } from "@/server/actions/bulk-upload-tree";
import { TreeBulkUploadClient } from "./components/tree-bulk-upload-client";

export default async function TreeBulkUploadPage() {
  await requirePermission("bulk-upload-trees");
  const permissions = await getUserPermissionsForMenu("bulk-upload-trees");
  const parcels = await getTreeUploadParcels();

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold tracking-tight">Upload Massal Pohon Sawit</h2>
            <HelpHint menuKey="bulk-upload-trees" />
          </div>
          <p className="text-muted-foreground">
            Unggah titik pohon sawit per lahan menggunakan ZIP Shapefile point (.zip berisi berkas
            .shp, .dbf, .shx, .prj). Titik dikelompokkan otomatis berdasarkan atribut{" "}
            <span className="font-mono">parcel_id</span>.
          </p>
        </div>
      </div>
      <TreeBulkUploadClient parcels={parcels} permissions={permissions} />
    </div>
  );
}
