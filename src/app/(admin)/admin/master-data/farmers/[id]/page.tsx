import { requirePermission, hasPermission } from "@/lib/rbac";
import { getFarmerDetail } from "@/server/actions/farmer";
import { getFarmerTreeSummary, getFarmerTreePoints } from "@/server/actions/tree";
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
  const [canViewParcel, canEditParcel, treeSummary, treePoints] = await Promise.all([
    hasPermission("master-data-parcels", "VIEW"),
    hasPermission("master-data-parcels", "EDIT"),
    getFarmerTreeSummary(id),
    getFarmerTreePoints(id),
  ]);

  return (
    <FarmerDetailClient
      farmer={result.farmer}
      detail={result.detail}
      parcels={result.parcels}
      mapParcels={result.mapParcels}
      treeSummary={treeSummary}
      treePoints={treePoints}
      canEdit={canEdit}
      farmerGroups={farmerGroups}
      canViewParcel={canViewParcel}
      canEditParcel={canEditParcel}
    />
  );
}
