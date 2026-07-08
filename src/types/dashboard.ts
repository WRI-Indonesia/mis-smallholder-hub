// Dashboard & snapshot types (DASH-01)

// The 4 training packages displayed on the dashboard (OTHER excluded)
export type DashboardPackageCode =
  | "PAKET_1_BMP_PC_RSPO_NKT"
  | "PAKET_2_MK"
  | "PAKET_2_K3"
  | "PAKET_3_4_GEDSI_FINANCIAL_LIVELIHOOD_BUSDEV";

export type TrainingCounts = Record<DashboardPackageCode, number>;

export interface DashboardFilters {
  districtId?: string | null;
  farmerGroupId?: string | null;
  joinedYear?: number | null;
}

export interface DashboardStats {
  totalKelompokTani: number;
  totalPetani: number;
  totalPetaniLaki: number;
  totalPetaniPerempuan: number;
  totalPersilLahan: number;
  totalLuasLahan: number;
  trainingCounts: TrainingCounts;
}

export interface KTDetails {
  id: string;
  name: string;
  code: string | null;
  locationLat: number | null;
  locationLong: number | null;
  totalFarmers: number;
  totalFarmersMale: number;
  totalFarmersFemale: number;
  totalParcels: number;
  totalArea: number;
  trainingCoverage: TrainingCounts;
}

export interface DashboardSnapshotData extends DashboardStats {
  kelompokTaniList: KTDetails[];
}

export interface DashboardData {
  stats: DashboardStats;
  kelompokTaniList: KTDetails[];
}

// Options for the dashboard/snapshot filter bar
export interface DashboardFilterOptions {
  districts: { id: string; name: string }[];
  joinedYears: number[];
}

// The snapshot currently displayed on the Main Dashboard
export interface DashboardSnapshotView {
  snapshotDate: string;
  districtId: string | null;
  districtName: string | null;
  joinedYear: number | null;
  createdByName: string;
  data: DashboardSnapshotData;
}

// Snapshot list row (metadata only)
export interface SnapshotListItem {
  id: string;
  snapshotDate: string;
  districtId: string | null;
  districtName: string | null;
  joinedYear: number | null;
  createdByName: string;
  totalKelompokTani: number;
  totalPetani: number;
  totalPetaniLaki: number;
  totalPetaniPerempuan: number;
  totalPersilLahan: number;
  totalLuasLahan: number;
}

// Snapshot detail (full stored data)
export interface SnapshotDetail {
  id: string;
  snapshotDate: string;
  districtId: string | null;
  districtName: string | null;
  joinedYear: number | null;
  createdByName: string;
  createdAt: string;
  data: DashboardSnapshotData;
}
