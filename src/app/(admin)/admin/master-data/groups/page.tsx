import { getFarmerGroups, getDistrictsForDropdown } from "@/server/actions/farmer-group";
import { GroupListClient } from "./group-list-client";

export const metadata = { title: "Manajemen Kelompok Tani" };

export default async function GroupsPage() {
  const [groupsResult, districtsResult] = await Promise.all([
    getFarmerGroups(),
    getDistrictsForDropdown(),
  ]);

  return (
    <div className="p-6">
      <GroupListClient
        initialGroups={groupsResult.success ? (groupsResult.data ?? []) : []}
        districts={districtsResult.success ? (districtsResult.data ?? []) : []}
      />
    </div>
  );
}
