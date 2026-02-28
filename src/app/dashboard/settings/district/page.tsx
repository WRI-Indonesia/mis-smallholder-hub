import { getDistricts } from "@/lib/actions/district"
import { getProvinces } from "@/lib/actions/province"
import { DistrictClient } from "./client"

export default async function DistrictPage() {
  const [districtRes, provinceRes] = await Promise.all([
    getDistricts(),
    getProvinces()
  ])

  if (districtRes.error || provinceRes.error) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-red-500">
        Error loading data: {districtRes.error || provinceRes.error}
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6 w-full max-w-full overflow-hidden">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">District Management</h1>
      </div>
      <DistrictClient data={districtRes.data} provinces={provinceRes.data} />
    </div>
  )
}
