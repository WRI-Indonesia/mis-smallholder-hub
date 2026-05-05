import { getLandParcels, getFarmersForDropdown, getFarmerGroupsForDropdown, getCommodities } from "@/server/actions/land-parcel";
import { ParcelListClient } from "./parcel-list-client";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Data Persil Lahan" };

export default async function MasterDataParcelsPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const page = Number(searchParams?.page) || 1;
  const search =
    typeof searchParams?.search === "string" ? searchParams.search : undefined;
  const farmerGroupId =
    typeof searchParams?.group === "string" ? searchParams.group : undefined;

  const [parcelsResult, farmersResult, groupsResult, commoditiesResult] = await Promise.all([
    getLandParcels(page, 10, search, farmerGroupId),
    getFarmersForDropdown(),
    getFarmerGroupsForDropdown(),
    getCommodities(),
  ]);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Persil Lahan</h1>
        <p className="text-muted-foreground mt-1">
          Manajemen data persil lahan petani. Geometry (polygon) akan dikelola
          melalui GIS Tools pada Fase 6.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <ParcelListClient
            initialData={
              parcelsResult.success && parcelsResult.data
                ? parcelsResult.data
                : { data: [], total: 0, page: 1, totalPages: 1 }
            }
            farmers={farmersResult.success ? (farmersResult.data ?? []) : []}
            groups={groupsResult.success ? (groupsResult.data ?? []) : []}
            commodities={
              commoditiesResult.success ? (commoditiesResult.data ?? []) : []
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
