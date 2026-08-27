import { requirePermission, getUserPermissionsForMenu } from "@/lib/rbac";
import { HelpHint } from "@/app/(admin)/admin/help/help-hint";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getFarmersForMapping, getExistingParcelIds } from "@/server/actions/bulk-upload-parcel";
import { ParcelBulkUploadClient } from "./components/parcel-bulk-upload-client";
import { ParcelDetailUploadClient } from "./components/parcel-detail-upload-client";

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
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold tracking-tight">Upload Massal Lahan</h2>
            <HelpHint menuKey="bulk-upload-parcels" />
          </div>
          <p className="text-muted-foreground">
            Poligon lahan dari ZIP Shapefile (.shp, .dbf, .shx, .prj), atau detail lahan — surat
            kepemilikan, STDB, kode vendor — dari Excel untuk lahan yang sudah terdaftar.
          </p>
        </div>
      </div>
      {/* Dua mode dalam satu menu/izin (keputusan owner 2026-08-27, #296):
          keduanya mengisi entitas lahan yang sama, dikunci ID Lahan. */}
      <Tabs defaultValue="shapefile">
        <TabsList>
          <TabsTrigger value="shapefile">Poligon (Shapefile ZIP)</TabsTrigger>
          <TabsTrigger value="detail">Detail Lahan (Excel)</TabsTrigger>
        </TabsList>
        <TabsContent value="shapefile" className="pt-4">
          <ParcelBulkUploadClient
            farmers={farmers}
            existingParcels={existingParcels}
            permissions={permissions}
          />
        </TabsContent>
        <TabsContent value="detail" className="pt-4">
          <ParcelDetailUploadClient permissions={permissions} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
