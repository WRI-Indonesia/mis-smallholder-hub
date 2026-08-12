import { requirePermission, getUserPermissionsForMenu } from "@/lib/rbac";
import { HelpHint } from "@/app/(admin)/admin/help/help-hint";
import { getTrainingDashboardView } from "@/server/actions/dashboard-training";
import { TrainingDashboardClient } from "./training-dashboard-client";

export default async function TrainingDashboardPage() {
  await requirePermission("dashboard-training");

  // Live query (bukan snapshot seperti BMP); filter Distrik/Lembaga/Kategori/
  // Tahun mengiris payload ini sepenuhnya di client.
  const [view, permissions] = await Promise.all([
    getTrainingDashboardView(),
    getUserPermissionsForMenu("dashboard-training"),
  ]);

  return (
    <div className="p-6">
      <TrainingDashboardClient
        view={view}
        helpSlot={<HelpHint menuKey="dashboard-training" />}
        canExport={permissions.includes("EXPORT")}
      />
    </div>
  );
}
