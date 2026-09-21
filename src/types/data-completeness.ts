// Types for DA-02 — Analisa Ketersediaan Data Lembaga Petani (Data Completeness & Anomaly Analysis)

// Domain identifiers (per master data)
export type CompletenessDomain = "petani" | "lahan" | "pelatihan" | "produksi";

// Domain + profil Lembaga — kunci registri check & cakupan modul (#352).
export type CompletenessDomainKey = "profil" | CompletenessDomain;

// Grain entitas yang dinilai — penyebut untuk pelipatan anomali sistemik (#352 A3).
export type CompletenessGrain = "lembaga" | "petani" | "persil" | "aktivitas";

/**
 * Jenis check (#352 putaran 2): `inti`/`lapangan`/`validitas` masuk skor domain;
 * `relasi` (hubungan antar data — bisa dilipat sistemik), `kualitas`
 * (konsistensi/plausibilitas — tak pernah dilipat) dan `modul` (cakupan
 * satelit) informatif.
 */
export type CheckKind = "inti" | "lapangan" | "validitas" | "relasi" | "kualitas" | "modul";

// Rute perbaikan satu anomali/modul: menu tujuan + kolom yang diisi (#352 B2 "Perbaiki lewat").
export type CompletenessFix = {
  menu: string;      // "Master Data › Petani"
  field?: string;    // "NIK"
  href?: string;     // tujuan tautan; kosong bila hanya lewat skrip/admin sistem
};

// One entity flagged by an anomaly (farmer- or parcel-focused)
export type AnomalyItem = {
  farmerDbId: string;
  farmerId: string;   // kode petani (human-readable)
  farmerName: string;
  detail?: string;    // e.g. parcelId, NIK yang bermasalah, dsb.
  parcelDbId?: string; // LandParcel.id bila anomali bergrain persil — tautan ke Detail Lahan
};

// A single anomaly type within a domain
export type DomainAnomaly = {
  key: string;        // "no-nik", "invalid-nik", ...
  label: string;      // "Petani tanpa NIK"
  kind: CheckKind;
  /**
   * Jumlah TEMUAN yang dihitung badge & totalAnomalies: sama dengan
   * `entityCount`, atau 1 bila anomali dilipat sebagai sistemik (#352 A3).
   */
  count: number;
  entityCount: number; // entitas terdampak (petani/persil)
  total: number;       // penyebut — entitas yang diperiksa; 0 bila anomali tanpa grain
  grain: CompletenessGrain;
  /** ≥ SYSTEMIC_THRESHOLD entitas kosong → satu temuan agregat "kolom belum pernah diisi". */
  systemic: boolean;
  fix: CompletenessFix;
  items: AnomalyItem[];
};

// One small summary card in a domain section
export type DomainCard = {
  label: string;
  value: number | string;
};

/**
 * Satu baris checklist domain (#352 putaran 2) — SEMUA check tampil, termasuk
 * yang lolos penuh, supaya pengguna melihat "apa saja yang dicek" dan % OK-nya.
 * Daftar entitas bermasalah dicari client lewat `key` di `anomalies` (check
 * inti/validitas/kualitas) atau `missing` di `ModuleCoverage` (modul).
 */
export type CheckRow = {
  key: string;
  label: string;
  kind: CheckKind;
  grain: CompletenessGrain;
  /** Entitas bermasalah / entitas diperiksa. */
  flagged: number;
  total: number;
  /** Bobot check dalam skor domain sebagai pecahan 0–1 (inti/lapangan/validitas); undefined bila informatif. */
  weight?: number;
  /** Bobot untuk tampilan, mis. "3/15", "1/6", "1/4 paket". */
  weightLabel?: string;
  systemic: boolean;
  /** false = modul belum dimulai di Lembaga ini (tidak berlaku). */
  applicable: boolean;
  fix: CompletenessFix;
};

// Result for one domain (petani/lahan/pelatihan/produksi)
export type DomainResult = {
  domain: CompletenessDomain;
  label: string;
  score: number;          // 0-100
  totalAnomalies: number;
  cards: DomainCard[];
  anomalies: DomainAnomaly[];
  /** Checklist lengkap domain (inti → validitas → kualitas → modul). */
  checks: CheckRow[];
  training?: TrainingCoverageDetail; // hanya pada domain "pelatihan"
};

/** Satu tindakan perbaikan berdampak ke Index — urut dampak terbesar (#352 putaran 2). */
export type PriorityItem = {
  key: string;
  domain: CompletenessDomainKey;
  label: string;
  flagged: number;
  total: number;
  /** Kenaikan Index (poin, 0–100) bila check ini lengkap 100 %. */
  indexGain: number;
  fix: CompletenessFix;
};

/** Rincian per Kelompok Tani (subGroupLv2 lahan) di dalam satu Lembaga (#352 putaran 2). */
export type KelompokTaniRow = {
  name: string;          // "(tanpa Kelompok Tani)" bila kosong
  farmers: number;
  parcels: number;
  areaHa: number;
  lahanScore: number;    // rata-rata skor persil KT ini, 0–100
  petaniScore: number;   // rata-rata check petani pemilik lahan di KT ini, 0–100
  parcelsProducing: number;
  parcelsProducingPct: number;
};

// ── DA-02b: detail cakupan pelatihan per paket (Domain Pelatihan) ──

// Ringkasan satu paket wajib untuk KT terpilih (4a)
export type TrainingPackageCoverage = {
  code: string;
  label: string;                 // ref_training_package.name
  totalFarmers: number;
  covered: number;               // petani sudah ikut paket ini
  notCovered: number;            // petani belum ikut
  coveragePct: number;           // 0-100
  activityCount: number;         // jumlah TrainingActivity aktif paket ini di KT
  hasActivity: boolean;
  notCoveredFarmers: AnomalyItem[]; // daftar petani belum ikut paket ini
};

// Satu baris matriks cakupan (petani × paket) — 4b
export type TrainingCoverageRow = {
  farmerDbId: string;
  farmerId: string;
  farmerName: string;
  cells: { code: string; done: boolean }[];
};

// Petani yang belum mengikuti seluruh paket wajib — 4c
export type IncompleteTrainingFarmer = {
  farmerDbId: string;
  farmerId: string;
  farmerName: string;
  doneCount: number;
  total: number;
  coveragePct: number;           // 0-100
  missing: string[];             // label paket yang masih kurang
};

export type TrainingCoverageDetail = {
  packages: { code: string; label: string }[];
  packageCoverage: TrainingPackageCoverage[];   // 4a
  matrix: TrainingCoverageRow[];                 // 4b
  incompleteFarmers: IncompleteTrainingFarmer[]; // 4c (urut cakupan terendah)
  completeFarmers: number;
  incompleteCount: number;
  coverageScore: number;         // rata-rata coveragePct petani (0-100) = skor domain
};

// A single check on the KT profile record (Domain 1)
export type ProfileCheck = {
  key: string;
  label: string;
  kind: CheckKind;        // inti (masuk skor) atau kualitas (informatif)
  complete: boolean;
  value?: string | null;  // nilai aktual bila ada
  fix: CompletenessFix;
};

// ── Cakupan modul (#352 A1) — informatif, TIDAK masuk Index ──
// Tiga keadaan per modul: terisi (pct), kosong (pct 0), tidak berlaku
// (`applicable: false`, pct null) bila modul belum dimulai sama sekali di
// Lembaga ini — keluar dari penyebut supaya Lembaga tak dihukum untuk modul
// yang belum ada di wilayahnya.
export type ModuleCoverage = {
  key: string;
  label: string;
  domain: CompletenessDomainKey;
  grain: CompletenessGrain;
  covered: number;
  total: number;
  pct: number | null;
  applicable: boolean;
  fix: CompletenessFix;
  /** Entitas yang belum mengisi modul (daftar kerja; kosong untuk grain lembaga/aktivitas). */
  missing: AnomalyItem[];
};

// Full result returned by analyzeFarmerGroupCompleteness
export type DataCompletenessResult = {
  group: {
    id: string;
    name: string;
    code: string | null;
    districtName: string;
  };
  healthScore: number;      // 0-100, weighted across domains
  totalAnomalies: number;
  totalFarmers: number;
  profileScore: number;     // Domain 1 (Profil KT) score, 0-100
  profileChecks: ProfileCheck[];
  domains: DomainResult[];  // petani, lahan, pelatihan, produksi
  /** Cakupan modul (A1) — kosong bila input tidak memuat flag modul. */
  moduleCoverage: ModuleCoverage[];
  /** Tindakan berdampak terbesar ke Index, urut turun (maks 8). */
  priorities: PriorityItem[];
  /** Rincian per Kelompok Tani (urut skor lahan terendah). */
  byKelompokTani: KelompokTaniRow[];
  /** Periode acuan (YYYY-MM) untuk check kebaruan produksi. */
  referencePeriod: string;
};

// ── Input shape consumed by the pure computeCompleteness() logic ──
// Mirrors the Prisma select in analyzeFarmerGroupCompleteness.

/** Kehadiran modul tingkat Lembaga — dimuat lewat kueri id-set terpisah (#352). */
export type GroupModuleFlags = {
  boundary: boolean;            // FarmerGroupBoundary aktif (#266)
  benchmark: boolean;           // ReferenceBenchmark aktif (#243)
  bmpGroupAssessment: boolean;  // BmpGroupAssessment aktif tahun acuan (#346)
  /** Titik koordinat Lembaga di luar poligon kabupaten (BIG); null = tak bisa dicek (tanpa boundary/koordinat). */
  coordinateOutsideDistrict?: boolean | null;
};

export type FarmerModuleFlags = {
  stdb: boolean;           // ≥1 LandStdb aktif (tahap apa pun)
  bmpAssessment: boolean;  // BmpAssessment aktif tahun acuan
  /** Penilaian Monev BMP (tahun mana pun) tanpa satu pun rincian indikator — rekap saja. */
  bmpAssessmentNoDetails?: boolean;
};

export type ParcelModuleFlags = {
  document: boolean;    // LandParcelDocument aktif
  stdbIssued: boolean;  // LandParcelStdb aktif → LandStdb TERBIT
  externalId: boolean;  // LandParcelExternalId aktif
  nkt: boolean;         // LandParcelNkt ada (status apa pun — "sudah dinilai")
  border: boolean;      // LandParcelBorder keempat arah terisi
  marker: boolean;      // ≥1 LandParcelMarker aktif
  tree: boolean;        // ≥1 Tree aktif pada revisi lahan aktif
  program: boolean;     // ≥1 LandParcelProgram aktif
  /** Status NKT bila dinilai ("AFFECTED" | "NOT_AFFECTED"). */
  nktStatus?: string | null;
  /** Poligon tidak beririsan dengan boundary ICS Lembaga; null = tak bisa dicek (tanpa boundary/geometry). */
  outsideBoundary?: boolean | null;
};

export type CompletenessGroupInput = {
  id: string;
  name: string;
  code: string | null;
  abrv: string | null;
  joinYear: number | null;
  groupType: string | null;
  establishedYear: number | null;
  rspoCertYear: number | null;
  rspoCertStatus: string | null;
  ispoCertYear: number | null;
  ispoCertStatus: string | null;
  sapMapAssuranceYear: number | null;
  sapMapAssuranceStatus: string | null;
  locationLat: number | null;
  locationLong: number | null;
  district: { id: string; name: string };
  activities: { packageCode: string; hasEvidence: boolean }[]; // aktivitas pelatihan aktif KT ini (per paket)
  trainingPackages: { code: string; name: string }[]; // paket wajib (isActive, exclude OTHER)
  farmers: CompletenessFarmerInput[];
  /** Opsional: bila tidak dimuat, `moduleCoverage` hasil = [] (skor inti tak terpengaruh). */
  modules?: GroupModuleFlags;
};

export type CompletenessParcelInput = {
  id: string;         // LandParcel.id (baris revisi aktif) — tautan detail + tautan produksi
  parcelId: string;
  geometry: unknown | null;
  area: number | null;
  plantingYear: number | null;
  cropType: string | null;
  landStatus: string | null;
  subGroupLv2: string | null; // Kelompok Tani
  blok: string | null;
  isPsr: boolean;             // replanting → produksi 0 wajar
  /** Luas poligon (ha) dari PostGIS `ST_Area(geom::geography)`; undefined bila tidak dimuat, null bila tanpa geometry. */
  geometryAreaHa?: number | null;
  modules?: ParcelModuleFlags;
};

export type CompletenessFarmerInput = {
  id: string;
  farmerId: string;
  name: string;
  gender: "M" | "F" | null;
  nik: string | null;
  address: string | null;
  birthPlace: string | null;
  birthDate: Date | null;
  joinedYear: number | null;
  landParcels: CompletenessParcelInput[];
  trainingParticipants: {
    id: string;
    preTestScore: number | null;
    postTestScore: number | null;
    packageCode: string; // kode paket dari activity terkait (this-KT, aktif)
  }[];
  productionRecords: {
    id: string;
    parcelId: string | null; // LandParcel.id
    period: string;          // YYYY-MM
    yieldKg: number;
    isEstimate: boolean;     // notes berlabel "Estimasi" (impor #TBR/#RSB)
  }[];
  modules?: FarmerModuleFlags;
};
