import { requirePermission, getUserPermissionsForMenu } from "@/lib/rbac";
import { HelpHint } from "@/app/(admin)/admin/help/help-hint";
import { getBmpMonevDashboardView } from "@/server/actions/dashboard-bmp-monev";
import { BmpMonevDashboardClient } from "./bmp-monev-dashboard-client";

export default async function BmpMonevDashboardPage() {
  await requirePermission("dashboard-bmp-monev");

  // Live query (pola Dashboard Pelatihan, bukan snapshot BMP Produksi); filter
  // Distrik/Lembaga/Tahun mengiris payload ini sepenuhnya di client.
  const [view, permissions] = await Promise.all([
    getBmpMonevDashboardView(),
    getUserPermissionsForMenu("dashboard-bmp-monev"),
  ]);

  return (
    <div className="p-6">
      <BmpMonevDashboardClient
        view={view}
        helpSlot={<HelpHint menuKey="dashboard-bmp-monev" />}
        canExport={permissions.includes("EXPORT")}
      />
    </div>
  );
}
