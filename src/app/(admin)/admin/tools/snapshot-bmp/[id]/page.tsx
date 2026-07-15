import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import { getBmpSnapshotById } from "@/server/actions/snapshot-bmp";
import { SnapshotBmpDetailClient } from "./snapshot-bmp-detail-client";

export default async function SnapshotBmpDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("dashboard-snapshot-bmp");
  const { id } = await params;

  const snapshot = await getBmpSnapshotById(id);
  if (!snapshot) notFound();

  return (
    <div className="p-6 space-y-6">
      <SnapshotBmpDetailClient snapshot={snapshot} />
    </div>
  );
}
