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

/** Jumlah Lembaga per status untuk satu skema sertifikasi/assurance (#169). */
export interface CertSchemeCounts {
  certified: number;
  planned: number;
}

/** Rekap sertifikasi RSPO/ISPO + Assurance SAP/MAP — year-independent, per Lembaga (#169). */
export interface CertStats {
  rspo: CertSchemeCounts;
  ispo: CertSchemeCounts;
  sapMap: CertSchemeCounts;
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
  certStats: CertStats;
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
  /** Status + tahun sertifikasi/assurance per Lembaga — optional: snapshot pra-#169 tidak memilikinya. */
  rspoCertStatus?: string | null;
  rspoCertYear?: number | null;
  ispoCertStatus?: string | null;
  ispoCertYear?: number | null;
  sapMapAssuranceStatus?: string | null;
  sapMapAssuranceYear?: number | null;
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

// ── Dashboard BMP (DASH-04, #166) — snapshot-backed, sliceable client-side ──

export type BmpFarmerGroupCategory = "EX_PLASMA" | "SWADAYA";

/** Ketersediaan data produksi per lahan (kategori MAP-02), dihitung saat generate. */
export interface BmpAvailabilityCounts {
  baik: number;
  cukup: number;
  kurang: number;
  tidakAda: number;
}

/** Statistik produksi satu bulan kalender (key = period YYYY-MM). */
export interface BmpMonthlyStat {
  produksiTon: number;
  /** Distinct lahan dengan record produksi pada period ini. */
  lahanMelapor: number;
  /** Total luas (ha) lahan yang melapor pada period ini. */
  luasMelaporHa: number;
}

export interface BmpGroupTotals {
  produksiTon: number;
  /** Luas (ha) lahan dengan ≥1 record produksi — pembagi Produktivitas. */
  luasMelaporHa: number;
  /** Distinct lahan dengan ≥1 record produksi. */
  lahanBerData: number;
  totalLahan: number;
  /** Distinct petani dengan ≥1 record produksi. */
  petaniMelapor: number;
  totalPetani: number;
}

/** Statistik produksi satu tahun (subset totals — totalLahan/totalPetani year-independent). */
export interface BmpYearStats {
  produksiTon: number;
  luasMelaporHa: number;
  lahanBerData: number;
  petaniMelapor: number;
}

/** Entri per Lembaga Petani — grain snapshot BMP; semua filter di-slice dari sini. */
export interface BmpGroupEntry {
  id: string;
  name: string;
  code: string | null;
  category: BmpFarmerGroupCategory;
  districtId: string | null;
  districtName: string | null;
  monthly: Record<string, BmpMonthlyStat>;
  /** Breakdown per tahun (key = tahun) untuk filter Tahun global — pola byYear Main Dashboard. */
  byYear: Record<string, BmpYearStats>;
  /**
   * Subset "Full 1 Tahun": hanya record dari LAHAN yang punya data di SEMUA
   * 12 bulan (Jan–Des) tahun ybs — tahun berjalan belum bisa full sampai
   * Desember terisi. Record tanpa lahan tidak pernah masuk subset ini.
   */
  monthlyFull: Record<string, BmpMonthlyStat>;
  byYearFull: Record<string, BmpYearStats>;
  availability: BmpAvailabilityCounts;
  totals: BmpGroupTotals;
}

/** Mode kelengkapan data pada slicing dashboard BMP. */
export type BmpDataMode = "all" | "full";

export interface BmpSnapshotData {
  groups: BmpGroupEntry[];
}

/** Hasil slicing snapshot (per filter distrik/lembaga/kategori/tahun) — bahan cards, chart, panel. */
export interface BmpSlicedStats {
  totals: BmpGroupTotals;
  availability: BmpAvailabilityCounts;
  monthly: Record<string, BmpMonthlyStat>;
  /** Ton/Ha per tahun: Σ produksi ÷ Σ luas melapor pada tahun-tahun terpilih. */
  produktivitasTonHa: number;
}

/** Satu titik chart bulanan: bar produksi + line cakupan pelaporan. */
export interface BmpChartPoint {
  monthIndex: number; // 0 = Jan … 11 = Des
  produksiTon: number;
  lahanMelapor: number;
  /** % lahan melapor terhadap total lahan slice (0–100). */
  coveragePct: number;
}

export interface BmpSnapshotView {
  snapshotDate: string;
  createdByName: string;
  data: BmpSnapshotData;
}

export interface BmpSnapshotListItem {
  id: string;
  snapshotDate: string;
  districtId: string | null;
  districtName: string | null;
  createdByName: string;
  totalProduksiTon: number;
  lahanBerData: number;
  totalLahan: number;
  petaniMelapor: number;
  totalPetani: number;
}

export interface BmpSnapshotDetail {
  id: string;
  snapshotDate: string;
  districtId: string | null;
  districtName: string | null;
  createdByName: string;
  createdAt: string;
  data: BmpSnapshotData;
}
