import { getDashboardStats, getDashboardGroupMarkers, getDistrictsForDashboard, getBatchesForDashboard } from "@/server/actions/dashboard";
import { DashboardClient } from "./dashboard-client";

interface DashboardServerProps {
  searchParams?: {
    districtId?: string;
    batchId?: string;
  };
}

export async function DashboardServer({ searchParams }: DashboardServerProps) {
  const filters = {
    districtId: searchParams?.districtId,
    batchId: searchParams?.batchId,
  };

  // Fetch data in parallel
  const [statsResult, markersResult, districtsResult, batchesResult] = await Promise.all([
    getDashboardStats(filters),
    getDashboardGroupMarkers(filters),
    getDistrictsForDashboard(),
    getBatchesForDashboard(),
  ]);

  if (!statsResult.success) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-lg font-semibold text-destructive">Error loading dashboard data</p>
          <p className="text-sm text-muted-foreground">{statsResult.error}</p>
        </div>
      </div>
    );
  }

  if (!markersResult.success) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-lg font-semibold text-destructive">Error loading map data</p>
          <p className="text-sm text-muted-foreground">{markersResult.error}</p>
        </div>
      </div>
    );
  }

  if (!districtsResult.success) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-lg font-semibold text-destructive">Error loading districts</p>
          <p className="text-sm text-muted-foreground">{districtsResult.error}</p>
        </div>
      </div>
    );
  }

  if (!batchesResult.success) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-lg font-semibold text-destructive">Error loading batches</p>
          <p className="text-sm text-muted-foreground">{batchesResult.error}</p>
        </div>
      </div>
    );
  }

  // Transform stats to match expected format
  const stats = statsResult.data;
  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-lg font-semibold text-destructive">Error loading dashboard stats</p>
          <p className="text-sm text-muted-foreground">Stats data is unavailable</p>
        </div>
      </div>
    );
  }
  
  const formattedStats = [
    {
      icon: "UsersRound",
      label: "Total Kelompok Tani",
      value: stats.totalGroups.toLocaleString("id-ID"),
    },
    {
      icon: "Users", 
      label: "Total Petani",
      value: stats.totalFarmers.toLocaleString("id-ID"),
    },
    {
      icon: "UserCheck",
      label: "Petani Laki-laki", 
      value: stats.maleFarmers.toLocaleString("id-ID"),
    },
    {
      icon: "Users",
      label: "Petani Perempuan",
      value: stats.femaleFarmers.toLocaleString("id-ID"), 
    },
    {
      icon: "MapPinned",
      label: "Total Lahan",
      value: stats.totalParcels.toLocaleString("id-ID"),
    },
    {
      icon: "LandPlot",
      label: "Luas Lahan",
      value: `${stats.totalAreaHa.toLocaleString("id-ID", { maximumFractionDigits: 1 })} Ha`,
    },
    {
      icon: "GraduationCap",
      label: "Training PKT",
      value: stats.trainingPKT.toLocaleString("id-ID"),
    },
    {
      icon: "GraduationCap", 
      label: "Training BMP/GAP",
      value: stats.trainingBMPGAP.toLocaleString("id-ID"),
    },
    {
      icon: "GraduationCap",
      label: "Training Pre-Sertifikasi", 
      value: stats.trainingPreSertifikasi.toLocaleString("id-ID"),
    },
  ];

  // Transform markers to match expected format - only include groups with valid coordinates
  if (!markersResult.data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-lg font-semibold text-destructive">Error loading map data</p>
          <p className="text-sm text-muted-foreground">Map markers data is unavailable</p>
        </div>
      </div>
    );
  }
  
  const farmerGroups = markersResult.data
    .filter(marker => marker.locationLat !== null && marker.locationLong !== null)
    .map(marker => ({
      id: marker.id,
      name: marker.name,
      region: marker.districtName,
      lat: marker.locationLat!,
      lng: marker.locationLong!,
      totalPetani: marker.farmerCount,
      maleFarmers: marker.maleFarmers,
      femaleFarmers: marker.femaleFarmers,
      totalParcels: marker.parcelCount,
      totalArea: `${marker.totalAreaHa.toFixed(1)} Ha`,
      trainingPackage1: marker.trainingPKT,
      trainingPackage2MK: marker.trainingBMPGAP,
      trainingPackage2HSE: 0, // Not available in current data
      trainingPackage34: marker.trainingPreSertifikasi,
    }));

  return (
    <DashboardClient
      initialStats={formattedStats}
      initialGroups={farmerGroups}
      districts={districtsResult.data || []}
      batches={batchesResult.data || []}
      currentFilters={filters}
    />
  );
}