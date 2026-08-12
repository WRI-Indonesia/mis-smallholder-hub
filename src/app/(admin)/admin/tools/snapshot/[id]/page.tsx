import { notFound } from "next/navigation";
import { requirePermission, getUserPermissionsForMenu } from "@/lib/rbac";
import { getSnapshotById } from "@/server/actions/snapshot";
import { SnapshotDetailClient } from "./snapshot-detail-client";

export default async function SnapshotDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("dashboard-snapshot");
  const { id } = await params;

  const [snapshot, permissions] = await Promise.all([
    getSnapshotById(id),
    getUserPermissionsForMenu("dashboard-snapshot"),
  ]);
  if (!snapshot) notFound();

  return (
    <div className="p-6 space-y-6">
      <SnapshotDetailClient
        snapshot={snapshot}
        canExport={permissions.includes("EXPORT")}
        canPrint={permissions.includes("PRINT")}
      />
    </div>
  );
}
