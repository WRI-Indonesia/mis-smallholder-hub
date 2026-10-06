import { requirePermission } from "@/lib/rbac";
import { getSupplyChainDashboardView } from "@/server/actions/supply-chain-prototype";
import { SupplyChainDashboardClient, SupplyChainUnavailable } from "./supply-chain-dashboard-client";

export default async function SupplyChainDashboardPage() {
  // Prototipe #379: menu belum di-seed → hanya SUPERADMIN (bypass) sampai menu ditambahkan.
  await requirePermission("dashboard-supply-chain");
  const view = await getSupplyChainDashboardView();

  return (
    <div className="p-6">
      {view.available ? (
        <SupplyChainDashboardClient view={view} />
      ) : (
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">Dashboard Rantai Pasok</h1>
          <SupplyChainUnavailable tablesDir={view.tablesDir} />
        </div>
      )}
    </div>
  );
}
