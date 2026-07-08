import { requirePermission, getUserPermissionsForMenu } from "@/lib/rbac";
import { getSnapshots, getSnapshotFilterOptions } from "@/server/actions/snapshot";
import { SnapshotClient } from "./snapshot-client";

export default async function SnapshotPage() {
  await requirePermission("dashboard-snapshot");

  const [snapshots, filterOptions, permissions] = await Promise.all([
    getSnapshots(),
    getSnapshotFilterOptions(),
    getUserPermissionsForMenu("dashboard-snapshot"),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard Snapshot</h1>
        <p className="text-muted-foreground">
          Buat dan kelola snapshot historis dari data dashboard
        </p>
      </div>
      <SnapshotClient snapshots={snapshots} filterOptions={filterOptions} permissions={permissions} />
    </div>
  );
}
