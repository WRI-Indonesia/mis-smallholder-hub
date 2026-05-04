import { getFarmerGroups, getDistrictsForDropdown } from "@/server/actions/farmer-group";
import { GroupListClient } from "./group-list-client";

export const metadata = { title: "Manajemen Kelompok Tani" };

export default async function GroupsPage() {
  const [groupsResult, districtsResult] = await Promise.all([
    getFarmerGroups(),
    getDistrictsForDropdown(),
  ]);

  if (groupsResult.success) {
    console.log(`PAGE DEBUG - Groups count: ${groupsResult.data?.length}`);
    if (groupsResult.data && groupsResult.data.length > 0) {
      console.log("PAGE DEBUG - First group abrv3id:", groupsResult.data[0].abrv3id);
    }
  }

  return (
    <div className="p-6">
      <GroupListClient
        initialGroups={groupsResult.success ? (groupsResult.data ?? []) : []}
        districts={districtsResult.success ? (districtsResult.data ?? []) : []}
      />
    </div>
  );
}
