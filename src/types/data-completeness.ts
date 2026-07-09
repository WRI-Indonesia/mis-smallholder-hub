// Types for DA-02 — Analisa Ketersediaan Data Kelompok Tani (Data Completeness & Anomaly Analysis)

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
  activities: { id: string }[];
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
  }[];
  productionRecords: {
    id: string;
    parcelId: string | null;
  }[];
};
