import { getVillages } from "@/lib/actions/village"
import { getSubDistricts } from "@/lib/actions/sub-district"
import { VillageClient } from "./client"

export default async function VillagePage() {
  const [villageRes, subDistrictRes] = await Promise.all([
    getVillages(),
    getSubDistricts() // We fetch sub-districts so user can select them in the village form
  ])

  if (villageRes.error || subDistrictRes.error) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-red-500">
        Error loading data: {villageRes.error || subDistrictRes.error}
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6 w-full max-w-full overflow-hidden">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Village Management</h1>
      </div>
      <VillageClient data={villageRes.data} subDistricts={subDistrictRes.data} />
    </div>
  )
}
