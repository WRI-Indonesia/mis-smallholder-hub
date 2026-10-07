import { requirePermission, getUserPermissionsForMenu } from "@/lib/rbac";
import { HelpHint } from "@/app/(admin)/admin/help/help-hint";
import { getParcelOverlaps } from "@/server/actions/parcel-overlap";
import { getParcelAreaMismatch, getParcelOutsideBoundary } from "@/server/actions/parcel-boundary-area";
import { ParcelTopologyTabs } from "./parcel-topology-tabs";

export default async function ParcelOverlapPage() {
  await requirePermission("data-analyst-parcel-overlap");

  // Tab baru dimuat terpisah (allSettled): galat PostGIS di salah satunya tak boleh
  // menjatuhkan tab Tumpang Tindih yang sudah ada (review ef4ed79).
  const [overlaps, permissions, outsideRes, areaRes] = await Promise.all([
    getParcelOverlaps(),
    getUserPermissionsForMenu("data-analyst-parcel-overlap"),
    ...([getParcelOutsideBoundary(), getParcelAreaMismatch()] as const).map((p) =>
      p.then((data) => ({ ok: true as const, data })).catch((e: unknown) => {
        console.error("Tumpang Tindih Lahan — tab gagal dimuat:", e);
        return { ok: false as const };
      })
    ),
  ]);
  const outside = outsideRes.ok ? (outsideRes.data as Awaited<ReturnType<typeof getParcelOutsideBoundary>>) : null;
  const areaMismatch = areaRes.ok ? (areaRes.data as Awaited<ReturnType<typeof getParcelAreaMismatch>>) : null;

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
