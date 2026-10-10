import { getUserPermissionsForMenu, requirePermission } from "@/lib/rbac";
import { HelpHint } from "@/app/(admin)/admin/help/help-hint";
import { getSupplyChainDashboardView } from "@/server/actions/supply-chain-prototype";
import { SupplyChainDashboardClient, SupplyChainUnavailable } from "./supply-chain-dashboard-client";

export default async function SupplyChainDashboardPage() {
  // Prototipe #379 — data dari tabel CSV (lokal / S3 privat), bukan DB.
  await requirePermission("dashboard-supply-chain");
  const [view, permissions] = await Promise.all([getSupplyChainDashboardView(), getUserPermissionsForMenu("dashboard-supply-chain")]);

  return (
    <div className="p-6">
      {view.available ? (
        <SupplyChainDashboardClient view={view} helpSlot={<HelpHint menuKey="dashboard-supply-chain" />} canExport={permissions.includes("EXPORT")} />
      ) : (
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">Dashboard Rantai Pasok</h1>
          <SupplyChainUnavailable tablesDir={view.tablesDir} />
        </div>
      )}
    </div>
  );
}
