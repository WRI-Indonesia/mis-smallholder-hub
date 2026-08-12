import { HelpHint } from "@/app/(admin)/admin/help/help-hint";
import { requirePermission, hasPermission } from "@/lib/rbac";
import { getProvincesForMap } from "@/server/actions/map";
import { MapParcelClient } from "./map-parcel-client";

export default async function MapParcelPage() {
  await requirePermission("map-parcel");
  const [provinces, canViewParcel, canEditParcel, canExport, canPrint] = await Promise.all([
    getProvincesForMap(),
    hasPermission("master-data-parcels", "VIEW"),
    hasPermission("master-data-parcels", "EDIT"),
    hasPermission("map-parcel", "EXPORT"),
    hasPermission("map-parcel", "PRINT"),
  ]);

  return (
    <MapParcelClient
      provinces={provinces}
      canViewParcel={canViewParcel}
      canEditParcel={canEditParcel}
      // Passport popup ikut PRINT map-parcel — konsisten dgn guard getParcelPassport
      canPrintParcel={canPrint}
      canExport={canExport}
      canPrint={canPrint}
      helpSlot={<HelpHint menuKey="map-parcel" />}
    />
  );
}
