import { requirePermission, getUserPermissionsForMenu, isSuperAdmin } from "@/lib/rbac";
import { HelpHint } from "@/app/(admin)/admin/help/help-hint";
import { getBmpAssessments } from "@/server/actions/bmp-assessment";
import { getFarmerGroupOptions } from "@/lib/select-options";
import { getDistrictsForSelect } from "@/server/actions/farmer-group";
import { BmpMonevListClient } from "./bmp-monev-list-client";

export default async function BmpMonevPage() {
  await requirePermission("master-data-bmp-monev");
  const [assessments, farmerGroups, districts, permissions, superAdmin] = await Promise.all([
    getBmpAssessments(),
    getFarmerGroupOptions("master-data-bmp-monev"),
    getDistrictsForSelect(),
    getUserPermissionsForMenu("master-data-bmp-monev"),
    isSuperAdmin(),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Monev BMP</h1>
          <HelpHint menuKey="master-data-bmp-monev" />
        </div>
        <p className="text-muted-foreground">
          Skor Monitoring &amp; Evaluasi praktik BMP per petani per tahun survei — kategori
          Teladan / Praktisi / Perintis / Belum Implementasi dihitung dari skor.
        </p>
      </div>
      <BmpMonevListClient
        initialRows={assessments}
        farmerGroups={farmerGroups}
        districts={districts}
        permissions={permissions}
        isSuperAdmin={superAdmin}
      />
    </div>
  );
}
