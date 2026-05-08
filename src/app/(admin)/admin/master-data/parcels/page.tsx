import { getLandParcels, getFarmersForDropdown, getFarmerGroupsForDropdown, getCommodities } from "@/server/actions/land-parcel";
import { ParcelListClient } from "./parcel-list-client";

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
    <div className="p-6">
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
    </div>
  );
}
