import { requirePermission, getUserPermissionsForMenu } from "@/lib/rbac";
import { HelpHint } from "@/app/(admin)/admin/help/help-hint";
import { getSnapshots } from "@/server/actions/snapshot";
import { SnapshotClient } from "./snapshot-client";

export default async function SnapshotPage() {
  await requirePermission("dashboard-snapshot");

  const [snapshots, permissions] = await Promise.all([
    getSnapshots(),
    getUserPermissionsForMenu("dashboard-snapshot"),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Dashboard Snapshot</h1>
          <HelpHint menuKey="dashboard-snapshot" />
        </div>
        <p className="text-muted-foreground">
          Buat dan kelola snapshot historis dari data dashboard
        </p>
      </div>
      <SnapshotClient snapshots={snapshots} permissions={permissions} />
    </div>
  );
}
