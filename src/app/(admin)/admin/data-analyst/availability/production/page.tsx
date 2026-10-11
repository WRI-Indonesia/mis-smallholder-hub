import { requirePermission, getUserPermissionsForMenu } from "@/lib/rbac";
import { HelpHint } from "@/app/(admin)/admin/help/help-hint";
import { getProductionAvailabilityView } from "@/server/actions/production-availability";
import { ProductionAvailabilityClient } from "./production-availability-client";

export default async function ProductionAvailabilityPage() {
  await requirePermission("data-analyst-availability-production");

  // Live query (K7) — tahun, filter, dan urutan mengiris payload di client;
  // baris petani/lahan dimuat terpisah saat dibuka (K2).
  const [view, permissions] = await Promise.all([
    getProductionAvailabilityView(),
    getUserPermissionsForMenu("data-analyst-availability-production"),
  ]);

  return (
    <div className="p-6">
      <ProductionAvailabilityClient
        view={view}
        canExport={permissions.includes("EXPORT")}
        helpSlot={<HelpHint menuKey="data-analyst-availability-production" />}
      />
    </div>
  );
}
