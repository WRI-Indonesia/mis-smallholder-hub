import { requirePermission } from "@/lib/rbac";
import { getProvincesForMap } from "@/server/actions/map";
import { MapBmpClient } from "./map-bmp-client";

export default async function MapBmpPage() {
  await requirePermission("map-bmp");
  const provinces = await getProvincesForMap();

  return <MapBmpClient provinces={provinces} />;
}
