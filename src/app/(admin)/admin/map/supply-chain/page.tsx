import { requirePermission } from "@/lib/rbac";
import { HelpHint } from "@/app/(admin)/admin/help/help-hint";
import { getSupplyChainMapView } from "@/server/actions/supply-chain-prototype";
import { SupplyChainUnavailable } from "../../dashboard/supply-chain/supply-chain-dashboard-client";
import { MapSupplyChainClient } from "./map-supply-chain-client";

export default async function MapSupplyChainPage() {
  // Prototipe #379 — data dari tabel CSV (lokal / S3 privat), bukan DB.
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
  return <MapSupplyChainClient view={view} helpSlot={<HelpHint menuKey="map-supply-chain" />} />;
}
