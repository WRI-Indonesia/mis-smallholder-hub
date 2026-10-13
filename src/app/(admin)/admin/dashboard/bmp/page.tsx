import { hasPermission, requirePermission } from "@/lib/rbac";
import { HelpHint } from "@/app/(admin)/admin/help/help-hint";
import { getLatestBmpSnapshot } from "@/server/actions/dashboard-bmp";
import { BmpDashboardClient } from "./bmp-dashboard-client";

export default async function BmpDashboardPage() {
  await requirePermission("dashboard-bmp");

  // Load the latest organization-wide BMP snapshot; the dashboard slices it
  // (Distrik / Lembaga Petani / Kategori / Tahun) entirely client-side.
  const [initialView, canExport] = await Promise.all([
    getLatestBmpSnapshot(),
    hasPermission("dashboard-bmp", "EXPORT"),
  ]);

  return (
    <div className="p-6">
      <BmpDashboardClient initialView={initialView} canExport={canExport} helpSlot={<HelpHint menuKey="dashboard-bmp" />} />
    </div>
  );
}
