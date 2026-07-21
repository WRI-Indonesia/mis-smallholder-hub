import { requirePermission, getUserPermissionsForMenu } from "@/lib/rbac";
import { HelpHint } from "@/app/(admin)/admin/help/help-hint";
import { getFarmerGroupsForMapping } from "@/server/actions/bulk-upload";
import { BulkUploadClient } from "./bulk-upload-client";

export default async function FarmerBulkUploadPage() {
  await requirePermission("bulk-upload-farmers");
  const permissions = await getUserPermissionsForMenu("bulk-upload-farmers");
  // Daftar ID existing TIDAK dimuat di sini: keunikan `farmerId` berlaku per
  // Lembaga (TD-024), jadi daftarnya baru bermakna setelah pengguna memilih
  // lembaga tujuan — client yang mengambilnya saat itu.
  const farmerGroups = await getFarmerGroupsForMapping();

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold tracking-tight">Upload Massal Petani</h2>
            <HelpHint menuKey="bulk-upload-farmers" />
          </div>
          <p className="text-muted-foreground">
            Unggah data petani menggunakan file Excel (.xlsx) atau CSV dengan pencocokan kolom
            dinamis.
          </p>
        </div>
      </div>
      <BulkUploadClient farmerGroups={farmerGroups} permissions={permissions} />
    </div>
  );
}
