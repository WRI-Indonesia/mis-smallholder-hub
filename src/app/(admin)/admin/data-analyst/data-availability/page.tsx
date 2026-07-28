import { requirePermission } from "@/lib/rbac";
import { getDataAvailabilityView } from "@/server/actions/data-availability";
import { DataAvailabilityClient } from "./data-availability-client";

export default async function DataAvailabilityDashboardPage() {
  await requirePermission("data-analyst-data-availability");

  // Live query (bukan snapshot); filter Distrik/Kategori mengiris payload ini
  // sepenuhnya di client.
  const view = await getDataAvailabilityView();

  return (
    <div className="p-6">
      <DataAvailabilityClient view={view} />
    </div>
  );
}
