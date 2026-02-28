import { getSubDistricts } from "@/lib/actions/sub-district"
import { getDistricts } from "@/lib/actions/district"
import { SubDistrictClient } from "./client"

export default async function SubDistrictPage() {
  const [subDistrictRes, districtRes] = await Promise.all([
    getSubDistricts(),
    getDistricts()
  ])

  if (subDistrictRes.error || districtRes.error) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-red-500">
        Error loading data: {subDistrictRes.error || districtRes.error}
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6 w-full max-w-full overflow-hidden">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Sub District Management</h1>
      </div>
      <SubDistrictClient data={subDistrictRes.data} districts={districtRes.data} />
    </div>
  )
}
