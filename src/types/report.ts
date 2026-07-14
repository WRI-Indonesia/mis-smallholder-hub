export interface FarmerReportFilters {
  districtId: string;
  farmerGroupId: string;
}

export interface FarmerReportSummary {
  totalPetani: number;
  totalPersil: number;
  totalLuasLahan: number;
  avgLuasLahan: number;
}

export interface FarmerReportRow {
  id: string;
  farmerId: string;
  name: string;
  gender: "M" | "F";
  nik: string | null;
  joinedYear: number | null;
  totalParcels: number;
  totalArea: number;
}

export interface FarmerReportResult {
  summary: FarmerReportSummary;
  rows: FarmerReportRow[];
}

export interface TrainingReportFilters {
  districtId: string;
  farmerGroupId: string;
}

export interface TrainingReportSummary {
  totalPetani: number;
  totalKegiatan: number;
  totalPeserta: number;
  totalPesertaUnik: number;
  totalUnikPaket1: number;
  pctPaket1: number;
  totalUnikPaket2MK: number;
  pctPaket2MK: number;
  totalUnikPaket2K3: number;
  pctPaket2K3: number;
  totalUnikPaket34: number;
  pctPaket34: number;
}

export interface TrainingActivityParticipant {
  farmerId: string;
  farmerIdCode: string;
  name: string;
  preTestScore: number | null;
  postTestScore: number | null;
}

export interface TrainingActivityReportRow {
  id: string;
  packageName: string;
  packageCode: string;
  trainingDate: string;
  location: string | null;
  totalParticipants: number;
  participants: TrainingActivityParticipant[];
}

export interface TrainingFarmerReportRow {
  id: string;
  farmerId: string;
  name: string;
  gender: "M" | "F";
  paket1Date: string | null;
  paket2MKDate: string | null;
  paket2K3Date: string | null;
  paket34Date: string | null;
}

export interface TrainingReportResult {
  summary: TrainingReportSummary;
  activities: TrainingActivityReportRow[];
  farmers: TrainingFarmerReportRow[];
}

export interface ProductionReportFilters {
  districtId: string;
  farmerGroupId: string;
  periodStart: string; // YYYY-MM
  periodEnd: string; // YYYY-MM
}

export interface ProductionReportRow {
  /** Unique key per farmer/parcel combination (a farmer with 2 parcels = 2 rows). */
  key: string;
  /** Farmer database id. */
  farmerId: string;
  /** Human-facing farmer code (e.g. ITM.14.06.06.2017.0001). */
  farmerCode: string;
  name: string;
  /** Land parcel database id (null when the record has no parcel). */
  parcelId: string | null;
  /** Human-facing parcel code / Id Lahan (null when unassigned). */
  parcelCode: string | null;
  /** Land parcel area in hectares (null when unassigned/unknown). */
  parcelArea: number | null;
  /** period (YYYY-MM) → summed yield (kg). Missing months are absent, not 0. */
  values: Record<string, number>;
  /** Sum of all months for this row. */
  total: number;
}

export interface ProductionReportSummary {
  totalPetani: number;
  totalLahan: number;
  totalProduksi: number;
  totalBulan: number;
}

export interface ProductionReportResult {
  /** Ordered list of YYYY-MM columns produced from the selected range. */
  periods: string[];
  rows: ProductionReportRow[];
  /** period (YYYY-MM) → column total across all rows. */
  columnTotals: Record<string, number>;
  grandTotal: number;
  summary: ProductionReportSummary;
}

export interface KelompokTaniReportFilters {
  districtId?: string | null;
  farmerGroupId?: string | null;
}

export interface KelompokTaniReportRow {
  /** Unique key per (Lembaga × Gapoktan × Kelompok Tani) combination. */
  key: string;
  farmerGroupId: string;
  /** FarmerGroup.name (= Lembaga Petani). */
  lembagaTani: string;
  /** Sub Lv.1 = Gapoktan (LandParcel.subGroupLv1), null bila kosong. */
  gapoktan: string | null;
  /** Sub Lv.2 = Kelompok Tani (LandParcel.subGroupLv2), null bila kosong. */
  kelompokTani: string | null;
  /** Distinct petani dengan ≥1 lahan aktif di kombinasi ini. */
  totalPetani: number;
  /** Jumlah lahan aktif di kombinasi ini. */
  totalLahan: number;
}

export interface KelompokTaniReportSummary {
  totalKelompokTani: number; // baris dengan Kelompok Tani non-null
  totalGapoktan: number; // distinct (Lembaga, Gapoktan) non-null
  totalLembagaTani: number; // distinct Lembaga
  totalPetani: number; // distinct petani keseluruhan
  totalLahan: number; // total lahan aktif
}

export interface KelompokTaniReportResult {
  summary: KelompokTaniReportSummary;
  rows: KelompokTaniReportRow[];
}

// ─── Report Kelompok Tani (Detail) (#154) — roster per Lembaga ───

export interface KtDetailPetani {
  /** Farmer.id (db). */
  farmerId: string;
  /** Farmer.farmerId (kode human-facing). */
  farmerCode: string;
  name: string;
  /** Jumlah lahan aktif petani ini pada kombinasi (Gapoktan × KT). */
  totalLahan: number;
  /** Total luas (Ha) lahan petani ini pada kombinasi tsb. */
  totalLuas: number;
}

export interface KtDetailKelompokTani {
  /** Kelompok Tani (subGroupLv2), null bila kosong. */
  kelompokTani: string | null;
  totalPetani: number;
  totalLahan: number;
  totalLuas: number;
  petani: KtDetailPetani[];
}

export interface KtDetailGapoktan {
  /** Gapoktan/KUD (subGroupLv1), null bila kosong. */
  gapoktan: string | null;
  totalKelompokTani: number; // baris KT non-null di Gapoktan ini
  totalPetani: number; // distinct petani di Gapoktan ini
  totalLahan: number;
  totalLuas: number;
  kelompokTaniList: KtDetailKelompokTani[];
}

export interface KelompokTaniDetailReportSummary {
  totalGapoktan: number; // distinct Gapoktan non-null
  totalKelompokTani: number; // distinct (Gapoktan × KT) non-null
  totalPetani: number; // distinct petani di Lembaga
  totalLahan: number;
  totalLuas: number;
}

export interface KelompokTaniDetailReportResult {
  farmerGroupId: string;
  /** FarmerGroup.name (= Lembaga Petani terpilih). */
  lembagaTani: string;
  summary: KelompokTaniDetailReportSummary;
  gapoktanList: KtDetailGapoktan[];
}
