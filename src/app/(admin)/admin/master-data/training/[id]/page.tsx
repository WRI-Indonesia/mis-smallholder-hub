import { requirePermission } from "@/lib/rbac";
import { getUserPermissionsForMenu } from "@/lib/rbac";
import { getTrainingActivityById } from "@/server/actions/training";
import { notFound } from "next/navigation";
import { TrainingDetailClient } from "./training-detail-client";

export default async function TrainingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("master-data-training");
  const { id } = await params;
  const activity = await getTrainingActivityById(id);
  const permissions = await getUserPermissionsForMenu("master-data-training");

  if (!activity) notFound();

  return (
    <div className="p-6 space-y-6">
      <TrainingDetailClient activity={activity} permissions={permissions} />
    </div>
  );
}
