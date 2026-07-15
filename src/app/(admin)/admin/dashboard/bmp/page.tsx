import { requirePermission } from "@/lib/rbac";
import { getLatestBmpSnapshot } from "@/server/actions/dashboard-bmp";
import { BmpDashboardClient } from "./bmp-dashboard-client";

export default async function BmpDashboardPage() {
  await requirePermission("dashboard-bmp");

  // Load the latest organization-wide BMP snapshot; the dashboard slices it
  // (Distrik / Lembaga Petani / Kategori / Tahun) entirely client-side.
  const initialView = await getLatestBmpSnapshot();

  return (
    <div className="p-6">
      <BmpDashboardClient initialView={initialView} />
    </div>
  );
}
