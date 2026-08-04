import { requirePermission, getUserPermissionsForMenu } from "@/lib/rbac";
import { HelpHint } from "@/app/(admin)/admin/help/help-hint";
import { getBmpSnapshots } from "@/server/actions/snapshot-bmp";
import { SnapshotBmpClient } from "./snapshot-bmp-client";

export default async function SnapshotBmpPage() {
  await requirePermission("dashboard-snapshot-bmp");

  const [snapshots, permissions] = await Promise.all([
    getBmpSnapshots(),
    getUserPermissionsForMenu("dashboard-snapshot-bmp"),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Dashboard Snapshot BMP</h1>
          <HelpHint menuKey="dashboard-snapshot" />
        </div>
        <p className="text-muted-foreground">
          Buat dan kelola snapshot historis dari data dashboard BMP
        </p>
      </div>
      <SnapshotBmpClient snapshots={snapshots} permissions={permissions} />
    </div>
  );
}
