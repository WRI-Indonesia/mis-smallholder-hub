import { requirePermission } from "@/lib/rbac";
import { getSupplyChainMapView } from "@/server/actions/supply-chain-prototype";
import { SupplyChainUnavailable } from "../../dashboard/supply-chain/supply-chain-dashboard-client";
import { MapSupplyChainClient } from "./map-supply-chain-client";

export default async function MapSupplyChainPage() {
  // Prototipe #379: menu belum di-seed → hanya SUPERADMIN (bypass) sampai menu ditambahkan.
  await requirePermission("map-supply-chain");
  const view = await getSupplyChainMapView();

  if (!view.available) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">Peta Rantai Pasok</h1>
        <SupplyChainUnavailable tablesDir={view.tablesDir} />
      </div>
    );
  }
  return <MapSupplyChainClient view={view} />;
}
