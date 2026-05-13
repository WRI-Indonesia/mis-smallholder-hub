import { BMPDashboardClient } from "./bmp-dashboard-client";
import {
  getBMPScoreData,
  getBMPMonthlyProduction,
  getBMPMonevData,
  getBMPDistricts,
  getBMPKelompokTani,
} from "@/lib/static-data/admin/dashboard/bmp";

interface BMPDashboardServerProps {
  searchParams?: {
    districtId?: string;
    kt?: string;
    chartKategori?: string;
  };
}

export async function BMPDashboardServer({ searchParams }: BMPDashboardServerProps) {
  const distrik = searchParams?.districtId || "All";
  const kt = searchParams?.kt || "All";
  const chartKategori = searchParams?.chartKategori || "All";

  const scoreData = getBMPScoreData(distrik, kt);
  const productionData = getBMPMonthlyProduction(distrik, kt, chartKategori);
  const monevData = getBMPMonevData(distrik, kt);
  const districts = getBMPDistricts();
  const kelompokTaniList = getBMPKelompokTani(); // all KTs, client filters by distrik

  return (
    <BMPDashboardClient
      scoreData={scoreData}
      productionData={productionData}
      monevData={monevData}
      districts={districts}
      kelompokTaniList={kelompokTaniList}
      currentDistrik={distrik}
      currentKT={kt}
      currentChartKategori={chartKategori}
    />
  );
}
