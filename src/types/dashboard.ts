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
  totalKelompokTani: number; // NB: jumlah FarmerGroup (= Lembaga Petani); mislabel legacy
  /** Distinct Kelompok Tani (LandParcel.subGroupLv2) turunan per-lahan, dijumlah per Lembaga (#148, interim TD-014). */
  totalKelompokTaniLahan: number;
  totalPetani: number;
  totalPetaniLaki: number;
  totalPetaniPerempuan: number;
  totalPersilLahan: number;
  totalLuasLahan: number;
  trainingCounts: TrainingCounts;
}

/** Farmer-derived stats for one KT, sliceable by joined year. */
export interface KTYearStats {
  totalFarmers: number;
  totalFarmersMale: number;
  totalFarmersFemale: number;
  totalParcels: number;
  totalArea: number;
  trainingCoverage: TrainingCounts;
}

export interface KTDetails extends KTYearStats {
  id: string;
  name: string;
  code: string | null;
  /** Distinct Kelompok Tani (subGroupLv2) di Lembaga ini — year-independent (#148). */
  kelompokTaniCount: number;
  districtId: string | null;
  districtName: string | null;
  locationLat: number | null;
  locationLong: number | null;
  // Per-joined-year breakdown (key = year as string). Farmers with no joined year
  // are only counted in the all-years aggregate above, not in any byYear bucket.
  byYear: Record<string, KTYearStats>;
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
  totalKelompokTani: number; // = jumlah Lembaga Petani (mislabel legacy)
  totalKelompokTaniLahan: number; // distinct subGroupLv2 (#148)
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
