import { requirePermission, hasPermission } from "@/lib/rbac";
import { getProvincesForMap } from "@/server/actions/map";
import { MapParcelClient } from "./map-parcel-client";

export default async function MapParcelPage() {
  await requirePermission("map-parcel");
  const [provinces, canViewParcel, canEditParcel] = await Promise.all([
    getProvincesForMap(),
    hasPermission("master-data-parcels", "VIEW"),
    hasPermission("master-data-parcels", "EDIT"),
  ]);

  return (
    <MapParcelClient
      provinces={provinces}
      canViewParcel={canViewParcel}
      canEditParcel={canEditParcel}
    />
  );
}
