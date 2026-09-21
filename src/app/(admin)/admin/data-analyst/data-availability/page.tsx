import { requirePermission, getUserPermissionsForMenu } from "@/lib/rbac";
import { HelpHint } from "@/app/(admin)/admin/help/help-hint";
import { getDataAvailabilityView } from "@/server/actions/data-availability";
import { DataAvailabilityClient } from "./data-availability-client";

export default async function DataAvailabilityDashboardPage() {
  await requirePermission("data-analyst-data-availability");

  // Live query (bukan snapshot); filter Distrik/Kategori/Lembaga mengiris
  // payload ini sepenuhnya di client.
  const [view, permissions] = await Promise.all([
    getDataAvailabilityView(),
    getUserPermissionsForMenu("data-analyst-data-availability"),
  ]);

  return (
    <div className="p-6">
      <DataAvailabilityClient
        view={view}
        canExport={permissions.includes("EXPORT")}
        helpSlot={<HelpHint menuKey="data-analyst-data-availability" />}
      />
    </div>
  );
}
