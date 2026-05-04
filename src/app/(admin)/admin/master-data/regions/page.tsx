import { getProvinces, getDistricts } from "@/server/actions/region";
import { RegionTreeClient } from "./region-tree-client";

export const metadata = { title: "Manajemen Wilayah" };

export default async function RegionsPage() {
  const [provincesResult, districtsResult] = await Promise.all([
    getProvinces(),
    getDistricts(),
  ]);

  return (
    <div className="p-6">
      <RegionTreeClient
        initialProvinces={provincesResult.success ? (provincesResult.data ?? []) : []}
        initialDistricts={districtsResult.success ? (districtsResult.data ?? []) : []}
      />
    </div>
  );
}
