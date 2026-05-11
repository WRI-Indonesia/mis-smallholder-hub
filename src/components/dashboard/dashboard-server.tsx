import { getDashboardStats, getDashboardGroupMarkers, getDistrictsForDashboard, getBatchesForDashboard, getTrainingPackagesForDashboard } from "@/server/actions/dashboard";
import { DashboardClient } from "./dashboard-client";
import { trimTrainingName } from "@/lib/text-utils";

// Helper function to get training value based on package code
function getTrainingValue(stats: any, packageCode: string, index: number): string {
  // Map package codes to existing stats fields
  const packageCodeMap: Record<string, keyof typeof stats> = {
    'PKT': 'trainingPKT',
    'BMPGAP': 'trainingBMPGAP', 
    'PRE-SERTIFIKASI': 'trainingPreSertifikasi',
  };
  
  const statKey = packageCodeMap[packageCode.toUpperCase()];
  if (statKey && stats[statKey] !== undefined) {
    return stats[statKey].toLocaleString("id-ID");
  }
  
  // Fallback to index-based mapping for unknown codes
  const fallbackStats = ['trainingPKT', 'trainingBMPGAP', 'trainingPreSertifikasi'];
  const fallbackKey = fallbackStats[index % fallbackStats.length] as keyof typeof stats;
  
  return stats[fallbackKey]?.toLocaleString("id-ID") || "0";
}

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
  const [statsResult, markersResult, districtsResult, batchesResult, trainingPackagesResult] = await Promise.all([
    getDashboardStats(filters),
    getDashboardGroupMarkers(filters),
    getDistrictsForDashboard(),
    getBatchesForDashboard(),
    getTrainingPackagesForDashboard(),
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

  if (!trainingPackagesResult.success) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-lg font-semibold text-destructive">Error loading training packages</p>
          <p className="text-sm text-muted-foreground">{trainingPackagesResult.error}</p>
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
    // Dynamic training cards based on ref-training-package
    ...(trainingPackagesResult.data || []).map((pkg, index) => ({
      icon: "GraduationCap",
      label: trimTrainingName(pkg.name),
      value: getTrainingValue(stats, pkg.code, index),
    })),
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