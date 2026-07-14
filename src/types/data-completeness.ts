// Types for DA-02 — Analisa Ketersediaan Data Lembaga Tani (Data Completeness & Anomaly Analysis)

// Domain identifiers (per master data)
export type CompletenessDomain = "petani" | "lahan" | "pelatihan" | "produksi";

// One entity flagged by an anomaly (farmer- or parcel-focused)
export type AnomalyItem = {
  farmerDbId: string;
  farmerId: string;   // kode petani (human-readable)
  farmerName: string;
  detail?: string;    // e.g. parcelId, NIK yang bermasalah, dsb.
};

// A single anomaly type within a domain
export type DomainAnomaly = {
  key: string;        // "no-nik", "invalid-nik", ...
  label: string;      // "Petani tanpa NIK"
  count: number;
  items: AnomalyItem[];
};

// One small summary card in a domain section
export type DomainCard = {
  label: string;
  value: number | string;
};

// Result for one domain (petani/lahan/pelatihan/produksi)
export type DomainResult = {
  domain: CompletenessDomain;
  label: string;
  score: number;          // 0-100
  totalAnomalies: number;
  cards: DomainCard[];
  anomalies: DomainAnomaly[];
  training?: TrainingCoverageDetail; // hanya pada domain "pelatihan"
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
  complete: boolean;
  value?: string | null;  // nilai aktual bila ada
};

// Filters/args sent to the analyze action
export type CompletenessFilters = {
  farmerGroupId: string;
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
};

// ── Input shape consumed by the pure computeCompleteness() logic ──
// Mirrors the Prisma select in analyzeFarmerGroupCompleteness.
export type CompletenessGroupInput = {
  id: string;
  name: string;
  code: string | null;
  abrv: string | null;
  joinYear: number | null;
  locationLat: number | null;
  locationLong: number | null;
  district: { id: string; name: string };
  activities: { packageCode: string }[]; // aktivitas pelatihan aktif KT ini (per paket)
  trainingPackages: { code: string; name: string }[]; // paket wajib (isActive, exclude OTHER)
  farmers: CompletenessFarmerInput[];
};

export type CompletenessFarmerInput = {
  id: string;
  farmerId: string;
  name: string;
  nik: string | null;
  address: string | null;
  birthDate: Date | null;
  joinedYear: number | null;
  landParcels: {
    parcelId: string;
    geometry: unknown | null;
    area: number | null;
    plantingYear: number | null;
    cropType: string | null;
    landStatus: string | null;
  }[];
  trainingParticipants: {
    id: string;
    preTestScore: number | null;
    postTestScore: number | null;
    packageCode: string; // kode paket dari activity terkait (this-KT, aktif)
  }[];
  productionRecords: {
    id: string;
    parcelId: string | null;
  }[];
};
