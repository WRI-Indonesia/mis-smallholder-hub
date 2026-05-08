import { getMapData } from "@/server/actions/map";
import { InteractiveMap } from "@/components/maps/interactive-map";

export const metadata = { title: "Interactive Map" };

export default async function InteractiveMapPage() {
  const result = await getMapData();

  const data = result.success && result.data
    ? result.data
    : {
        farmerGroups: [],
        landParcels: [],
        stats: { totalGroups: 0, totalFarmers: 0, totalParcels: 0, groupsWithCoords: 0, parcelsWithPolygon: 0 },
      };

  return (
    // Full-screen: override -m-6 padding dari admin layout, sama seperti dashboard/page.tsx
    <div className="-m-6" style={{ height: "calc(100vh - 56px)" }}>
      <InteractiveMap data={data} />
    </div>
  );
}
