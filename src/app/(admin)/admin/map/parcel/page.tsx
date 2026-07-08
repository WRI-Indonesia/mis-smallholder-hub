import { requirePermission } from "@/lib/rbac";
import { getProvincesForMap } from "@/server/actions/map";
import { MapParcelClient } from "./map-parcel-client";

export default async function MapParcelPage() {
  await requirePermission("map-parcel");
  const provinces = await getProvincesForMap();

  return <MapParcelClient provinces={provinces} />;
}
