import { requirePermission, getUserPermissionsForMenu } from "@/lib/rbac";
import { HelpHint } from "@/app/(admin)/admin/help/help-hint";
import { getParcelOverlaps } from "@/server/actions/parcel-overlap";
import { getParcelAreaMismatch, getParcelOutsideBoundary } from "@/server/actions/parcel-boundary-area";
import { ParcelTopologyTabs } from "./parcel-topology-tabs";

export default async function ParcelOverlapPage() {
  await requirePermission("data-analyst-parcel-overlap");

  const [overlaps, outside, areaMismatch, permissions] = await Promise.all([
    getParcelOverlaps(),
    getParcelOutsideBoundary(),
    getParcelAreaMismatch(),
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
          Pemeriksaan topology lahan: pasangan poligon yang bertumpang tindih (entri ganda, lahan tercakup, klaim lintas
          Lembaga), lahan di luar boundary ICS Lembaganya, dan luas tercatat yang beda dari poligonnya. Dihitung langsung
          dari data terkini.
        </p>
      </div>
      <ParcelTopologyTabs
        overlaps={overlaps}
        outside={outside}
        areaMismatch={areaMismatch}
        canExport={permissions.includes("EXPORT")}
      />
    </div>
  );
}
