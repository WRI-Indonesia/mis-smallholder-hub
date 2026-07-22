import { requirePermission, hasPermission } from "@/lib/rbac";
import { getProvincesForMap } from "@/server/actions/map";
import { MapBmpClient } from "./map-bmp-client";

export default async function MapBmpPage() {
  await requirePermission("map-bmp");
  const [provinces, canViewParcel, canEditParcel] = await Promise.all([
    getProvincesForMap(),
    hasPermission("master-data-parcels", "VIEW"),
    hasPermission("master-data-parcels", "EDIT"),
  ]);

  return (
    <MapBmpClient
      provinces={provinces}
      canViewParcel={canViewParcel}
      canEditParcel={canEditParcel}
    />
  );
}
