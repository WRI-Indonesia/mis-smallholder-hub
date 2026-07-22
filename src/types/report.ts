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
  /** Unique key per (Lembaga × Kelompok Tani) combination. */
  key: string;
  farmerGroupId: string;
  /** FarmerGroup.name (= Lembaga Petani). */
  lembagaTani: string;
  /** Sub Lv.2 = Kelompok Tani (LandParcel.subGroupLv2), null bila kosong. */
  kelompokTani: string | null;
  /** Distinct petani dengan ≥1 lahan aktif di kombinasi ini. */
  totalPetani: number;
  /** Jumlah lahan aktif di kombinasi ini. */
  totalLahan: number;
  /** Total luas (Ha) lahan aktif di kombinasi ini. */
  totalLuas: number;
}

export interface KelompokTaniReportSummary {
  totalKelompokTani: number; // baris dengan Kelompok Tani non-null
  totalLembagaTani: number; // distinct Lembaga
  totalPetani: number; // distinct petani keseluruhan
  totalLahan: number; // total lahan aktif
  totalLuas: number; // total luas (Ha) lahan aktif
}

export interface KelompokTaniReportResult {
  summary: KelompokTaniReportSummary;
  rows: KelompokTaniReportRow[];
}

// ─── Report Lahan (#177) — roster lahan datar per Lembaga Petani ───

export interface LandParcelReportFilters {
  districtId?: string | null;
  farmerGroupId?: string | null;
}

export interface LandParcelReportRow {
  /** LandParcel.id (DB) — key baris. */
  id: string;
  farmerGroupId: string;
  /** FarmerGroup.name (= Lembaga Petani). */
  lembagaTani: string;
  /** Farmer.name. */
  namaPetani: string;
  /** Farmer.farmerId (= ID Petani). */
  idPetani: string;
  /** LandParcel.parcelId (= ID Lahan). */
  idLahan: string;
  /** Sub Lv.2 = Kelompok Tani (LandParcel.subGroupLv2), null bila kosong. */
  kelompokTani: string | null;
  /** Blok kebun, null bila kosong. */
  blok: string | null;
  /** Komoditas (LandParcel.cropType), null bila kosong. */
  komoditas: string | null;
  /** Species komoditas, null bila kosong. */
  species: string | null;
  /** PSR (Peremajaan Sawit Rakyat) — lahan sedang replanting. */
  psr: boolean;
  /** Tahun tanam, null bila tak diketahui. */
  tahunTanam: number | null;
  /** Luas (Ha), null bila tak diketahui. */
  luas: number | null;
}

export interface LandParcelReportSummary {
  totalLahan: number; // total lahan aktif
  totalPetani: number; // distinct petani pemilik lahan
  totalKelompokTani: number; // distinct (Lembaga, KT) non-null
  totalLembagaTani: number; // distinct Lembaga
  totalLuas: number; // total luas (Ha), lahan tanpa luas dihitung 0
}

export interface LandParcelReportResult {
  summary: LandParcelReportSummary;
  rows: LandParcelReportRow[];
}

// ─── Report Kelompok Tani (Detail) (#154) — roster per Lembaga ───

export interface KtDetailPetani {
  /** Farmer.id (db). */
  farmerId: string;
  /** Farmer.farmerId (kode human-facing). */
  farmerCode: string;
  name: string;
  /** Jumlah lahan aktif petani ini pada Kelompok Tani ini. */
  totalLahan: number;
  /** Total luas (Ha) lahan petani ini pada KT tsb. */
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

export interface KelompokTaniDetailReportSummary {
  totalKelompokTani: number; // distinct KT non-null di Lembaga
  totalPetani: number; // distinct petani di Lembaga
  totalLahan: number;
  totalLuas: number;
}

export interface KelompokTaniDetailReportResult {
  farmerGroupId: string;
  /** FarmerGroup.name (= Lembaga Petani terpilih). */
  lembagaTani: string;
  summary: KelompokTaniDetailReportSummary;
  kelompokTaniList: KtDetailKelompokTani[];
}
