import { requirePermission, getUserPermissionsForMenu } from "@/lib/rbac";
import { HelpHint } from "@/app/(admin)/admin/help/help-hint";
import { getTrainingDashboardView } from "@/server/actions/dashboard-training";
import { getProgramTargets } from "@/server/actions/program-target";
import { TrainingDashboardClient } from "./training-dashboard-client";

export default async function TrainingDashboardPage() {
  await requirePermission("dashboard-training");

  // Live query (bukan snapshot seperti BMP); filter Distrik/Lembaga/Kategori/
  // Tahun mengiris payload ini sepenuhnya di client.
  const [view, permissions, targets] = await Promise.all([
    getTrainingDashboardView(),
    getUserPermissionsForMenu("dashboard-training"),
    // Target kontrak (#403) untuk tampilan "vs Kontrak" — galat tak boleh menjatuhkan dashboard.
    getProgramTargets()
      .then((t) => t.records)
      .catch((e: unknown) => {
        console.error("Dashboard Pelatihan — target program gagal dimuat:", e);
        return null;
      }),
  ]);

  return (
    <div className="p-6">
      <TrainingDashboardClient
        view={view}
        helpSlot={<HelpHint menuKey="dashboard-training" />}
        canExport={permissions.includes("EXPORT")}
        programTargets={targets}
      />
    </div>
  );
}
