import { requirePermission, getUserPermissionsForMenu } from "@/lib/rbac";
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
        <h1 className="text-2xl font-bold">Dashboard Snapshot BMP</h1>
        <p className="text-muted-foreground">
          Buat dan kelola snapshot historis dari data dashboard BMP
        </p>
      </div>
      <SnapshotBmpClient snapshots={snapshots} permissions={permissions} />
    </div>
  );
}
