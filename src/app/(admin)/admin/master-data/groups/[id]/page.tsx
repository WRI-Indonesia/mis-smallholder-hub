import { requirePermission, hasPermission } from "@/lib/rbac";
import { getFarmerGroupDetail, getDistrictsForSelect } from "@/server/actions/farmer-group";
import { notFound } from "next/navigation";
import { GroupDetailClient } from "./group-detail-client";

export default async function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("master-data-groups");
  const { id } = await params;

  const result = await getFarmerGroupDetail(id);
  if (!result) notFound();

  const canEdit = await hasPermission("master-data-groups", "EDIT");
  const districts = canEdit ? await getDistrictsForSelect() : [];

  return (
    <GroupDetailClient
      group={result.group}
      detail={result.detail}
      completeness={result.completeness}
      mapParcels={result.mapParcels}
      canEdit={canEdit}
      districts={districts}
    />
  );
}
