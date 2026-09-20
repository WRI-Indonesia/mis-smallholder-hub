import { requirePermission, hasPermission, getUserPermissionsForMenu } from "@/lib/rbac";
import { getFarmerDetail } from "@/server/actions/farmer";
import { getFarmerTreePoints } from "@/server/actions/tree";
import { getFarmerBmpAssessments } from "@/server/actions/bmp-assessment";
import { getFarmerGroupOptions } from "@/lib/select-options";
import { notFound } from "next/navigation";
import { FarmerDetailClient } from "./farmer-detail-client";

export default async function FarmerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("master-data-farmers");
  const { id } = await params;

  const result = await getFarmerDetail(id);
  if (!result) notFound();

  const canEdit = await hasPermission("master-data-farmers", "EDIT");
  const farmerGroups = canEdit ? await getFarmerGroupOptions("master-data-farmers") : [];
  const [canViewParcel, canEditParcel, canPrint, treePoints, bmpPermissions] = await Promise.all([
    hasPermission("master-data-parcels", "VIEW"),
    hasPermission("master-data-parcels", "EDIT"),
    hasPermission("master-data-farmers", "PRINT"),
    getFarmerTreePoints(id),
    // Tab Monev BMP (#344) menumpang izin menu Monev BMP: tanpa VIEW tab disembunyikan.
    getUserPermissionsForMenu("master-data-bmp-monev"),
  ]);
  const bmpAssessments = bmpPermissions.includes("VIEW") ? await getFarmerBmpAssessments(id) : [];

  // Jumlah pohon per lahan diturunkan dari titik yang sudah di-fetch —
  // dulu round-trip terpisah `getFarmerTreeSummary` dengan hasil identik (#241).
  const treeCountByParcel = new Map<string, number>();
  for (const t of treePoints) {
    treeCountByParcel.set(t.landParcelId, (treeCountByParcel.get(t.landParcelId) ?? 0) + 1);
  }
  const treeSummary = result.parcels.map((p) => ({
    parcelDbId: p.id,
    parcelId: p.parcelId,
    treeCount: treeCountByParcel.get(p.id) ?? 0,
  }));

  return (
    <FarmerDetailClient
      farmer={result.farmer}
      detail={result.detail}
      parcels={result.parcels}
      mapParcels={result.mapParcels}
      markerPoints={result.markerPoints}
      treeSummary={treeSummary}
      treePoints={treePoints}
      canEdit={canEdit}
      farmerGroups={farmerGroups}
      canViewParcel={canViewParcel}
      canEditParcel={canEditParcel}
      canPrint={canPrint}
      bmpAssessments={bmpAssessments}
      bmpPermissions={bmpPermissions}
    />
  );
}
