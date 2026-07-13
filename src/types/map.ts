import type { Polygon, MultiPolygon } from "geojson";

/** Filter input for the Peta Lahan map. District is required to bound the query. */
export type MapFilters = {
  provinceId?: string | null;
  districtId: string;
  farmerGroupId?: string | null;
};

/** A Kelompok Tani point (from FarmerGroup.locationLat/locationLong). */
export type KTPoint = {
  id: string;
  name: string;
  code: string | null;
  districtName: string;
  lat: number;
  long: number;
};

/** A land parcel feature: polygon area + derived centroid point. */
export type ParcelFeature = {
  id: string;
  parcelId: string;
  /** Farmer.id (relation key) of the parcel owner — used to lazy-load training. */
  farmerId: string;
  /** Farmer.farmerId business code (e.g. "FMR-01") shown in the popup header. */
  farmerCode: string;
  farmerName: string;
  farmerGroupName: string;
  area: number | null;
  plantingYear: number | null;
  cropType: string | null;
  landStatus: string | null;
  /** Centroid derived from the polygon, as [long, lat]. */
  centroid: [number, number];
  geometry: Polygon | MultiPolygon;
};

export type MapData = {
  kelompokTani: KTPoint[];
  parcels: ParcelFeature[];
  counts: { kt: number; parcelPoints: number; parcelAreas: number };
};

/** Lightweight option shape for the cascading filter dropdowns. */
export type MapSelectOption = { id: string; name: string };
export type MapGroupOption = { id: string; name: string; code: string | null };

// ── Peta BMP (MAP-02) ──────────────────────────────────────────────────────

/**
 * Filter input for the Peta BMP map. Kelompok Tani is required to bound the
 * query; Provinsi/Distrik are optional and only narrow the KT dropdown.
 */
export type BmpMapFilters = {
  provinceId?: string | null;
  districtId?: string | null;
  farmerGroupId: string;
};

/**
 * Production-data availability of a single parcel, by longest consecutive-month
 * run: BAIK (> 24 mo) · CUKUP (12–24) · KURANG (1–11) · NONE (no records).
 */
export type ProductionAvailabilityCategory = "BAIK" | "CUKUP" | "KURANG" | "NONE";

/** A land parcel colored by its production-data availability category. */
export type BmpParcelFeature = {
  id: string;
  parcelId: string;
  /** Farmer.farmerId business code (e.g. "FMR-01"), shown as "ID Petani". */
  farmerCode: string;
  farmerName: string;
  farmerGroupName: string;
  area: number | null;
  plantingYear: number | null;
  cropType: string | null;
  landStatus: string | null;
  /** Centroid derived from the polygon, as [long, lat]. */
  centroid: [number, number];
  geometry: Polygon | MultiPolygon;
  category: ProductionAvailabilityCategory;
  /** Longest run of consecutive months with production data. */
  streakMonths: number;
  /** Earliest / latest period (YYYY-MM) with production for this parcel, or null. */
  firstPeriod: string | null;
  lastPeriod: string | null;
  /** Unique sorted periods (YYYY-MM) with production data for this parcel. */
  periods: string[];
  /** Total production (kg) per period (YYYY-MM) for this parcel. */
  production: Record<string, number>;
};

export type BmpMapData = {
  parcels: BmpParcelFeature[];
  kt: KTPoint[];
  counts: { baik: number; cukup: number; kurang: number; none: number };
};

/** One training package's completion status for a farmer (parcel popup section). */
export type FarmerTrainingItem = {
  code: string;
  label: string;
  completed: boolean;
  /** ISO date of the earliest attendance for this package, or null. */
  date: string | null;
};

/** One year's monthly yield (kg): index 0 = Jan … 11 = Des, plus the year total. */
export type ProductionYear = { year: number; monthly: number[]; total: number };

/** Production summary for a parcel: cross-year monthly average + per-year breakdown. */
export type ProductionSummary = {
  /** Monthly average yield (kg) across all years with data; index 0 = Jan … 11 = Des. */
  monthly: number[];
  /** Per-year monthly yield (kg), sorted by year descending. */
  byYear: ProductionYear[];
  totalKg: number;
  recordCount: number;
};

/** Everything needed to render the Farm Passport PDF for one parcel. */
export type ParcelPassport = {
  farmer: {
    name: string;
    code: string;
    gender: string;
    birthPlace: string | null;
    birthDate: string | null;
    nik: string | null;
    address: string | null;
    joinedYear: number | null;
  };
  group: {
    name: string;
    code: string | null;
    districtName: string;
    provinceName: string;
  };
  parcel: {
    parcelId: string;
    area: number | null;
    landStatus: string | null;
    cropType: string | null;
    plantingYear: number | null;
    notes: string | null;
    centroid: [number, number];
    geometry: Polygon | MultiPolygon;
  };
  training: FarmerTrainingItem[];
  production: ProductionSummary;
};
