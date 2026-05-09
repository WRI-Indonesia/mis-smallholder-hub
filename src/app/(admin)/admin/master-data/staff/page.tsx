import {
  getStaff,
  getJobDesksForDropdown,
  getStaffForDropdown,
} from "@/server/actions/staff";
import { getDistrictsForDropdown } from "@/server/actions/farmer-group";
import { getFarmerGroupsForDropdown } from "@/server/actions/training";
import { StaffListClient } from "./staff-list-client";

export const metadata = { title: "Master Data Staff WRI" };

export default async function StaffPage() {
  const [staffResult, jobDesksResult, districtsResult, farmerGroupsResult, staffDropdownResult] =
    await Promise.all([
      getStaff(),
      getJobDesksForDropdown(),
      getDistrictsForDropdown(),
      getFarmerGroupsForDropdown(),
      getStaffForDropdown(),
    ]);

  return (
    <div className="p-6">
      <StaffListClient
        initialStaff={staffResult.success ? (staffResult.data ?? []) : []}
        jobDesks={jobDesksResult.success ? (jobDesksResult.data ?? []) : []}
        districts={districtsResult.success ? (districtsResult.data ?? []) : []}
        farmerGroups={farmerGroupsResult.success ? (farmerGroupsResult.data ?? []) : []}
        staffDropdown={staffDropdownResult.success ? (staffDropdownResult.data ?? []) : []}
      />
    </div>
  );
}
