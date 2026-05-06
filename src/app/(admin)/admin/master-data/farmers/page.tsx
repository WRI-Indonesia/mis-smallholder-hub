import { getFarmers, getBatchesForDropdown } from "@/server/actions/farmer";
import { getFarmerGroups } from "@/server/actions/farmer-group";
import { FarmerListClient } from "./farmer-list-client";

export const metadata = { title: "Data Petani" };

export default async function MasterDataFarmersPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const page = Number(searchParams?.page) || 1;
  const search = typeof searchParams?.search === "string" ? searchParams.search : undefined;
  const groupId = typeof searchParams?.group === "string" ? searchParams.group : undefined;

  const [farmersResult, groupsResult, batchesResult] = await Promise.all([
    getFarmers(page, 10, search, groupId),
    getFarmerGroups(),
    getBatchesForDropdown(),
  ]);

  return (
    <div className="p-6">
      <FarmerListClient
        initialData={farmersResult.success && farmersResult.data ? farmersResult.data : { data: [], total: 0, page: 1, totalPages: 1 }}
        groups={groupsResult.success ? (groupsResult.data ?? []) : []}
        batches={batchesResult.success ? (batchesResult.data ?? []) : []}
      />
    </div>
  );
}
