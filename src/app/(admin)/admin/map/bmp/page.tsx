import { HelpHint } from "@/app/(admin)/admin/help/help-hint";
import { requirePermission, hasPermission } from "@/lib/rbac";
import { getProvincesForMap } from "@/server/actions/map";
import { MapBmpClient } from "./map-bmp-client";

export default async function MapBmpPage() {
  await requirePermission("map-bmp");
  const [provinces, canViewParcel, canEditParcel, canExport, canPrint] = await Promise.all([
    getProvincesForMap(),
    hasPermission("master-data-parcels", "VIEW"),
    hasPermission("master-data-parcels", "EDIT"),
    hasPermission("map-bmp", "EXPORT"),
    hasPermission("map-bmp", "PRINT"),
  ]);

  return (
    <MapBmpClient
      provinces={provinces}
      canViewParcel={canViewParcel}
      canEditParcel={canEditParcel}
      canExport={canExport}
      canPrint={canPrint}
      helpSlot={<HelpHint menuKey="map-bmp" />}
    />
  );
}
