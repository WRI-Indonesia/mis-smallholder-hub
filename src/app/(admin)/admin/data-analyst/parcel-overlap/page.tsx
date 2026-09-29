import { requirePermission, getUserPermissionsForMenu } from "@/lib/rbac";
import { HelpHint } from "@/app/(admin)/admin/help/help-hint";
import { getParcelOverlaps } from "@/server/actions/parcel-overlap";
import { ParcelOverlapClient } from "./parcel-overlap-client";

export default async function ParcelOverlapPage() {
  await requirePermission("data-analyst-parcel-overlap");

  const [rows, permissions] = await Promise.all([
    getParcelOverlaps(),
    getUserPermissionsForMenu("data-analyst-parcel-overlap"),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Tumpang Tindih Lahan</h1>
          <HelpHint menuKey="data-analyst-parcel-overlap" />
        </div>
        <p className="text-muted-foreground">
          Pasangan poligon lahan yang saling bertumpang tindih — indikasi entri ganda, lahan yang tercakup lahan lain,
          atau klaim lintas Lembaga. Dihitung langsung dari data terkini.
        </p>
      </div>
      <ParcelOverlapClient rows={rows} canExport={permissions.includes("EXPORT")} />
    </div>
  );
}
