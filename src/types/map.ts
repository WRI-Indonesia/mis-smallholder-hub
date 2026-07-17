import type { Polygon, MultiPolygon } from "geojson";

/** Filter input for the Peta Lahan map. District is required to bound the query. */
export type MapFilters = {
  provinceId?: string | null;
  districtId: string;
  farmerGroupId?: string | null;
};

/** A Lembaga Petani point (from FarmerGroup.locationLat/locationLong). */
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
 * Filter input for the Peta BMP map. Lembaga Petani is required to bound the
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

// ── Peta BMP — produktivitas per persil (MAP-03) ───────────────────────────

/**
 * Productivity class of a parcel in Ton/Ha per year:
 * TINGGI (>= 20) · SEDANG (15–<20) · RENDAH (10–<15) · SANGAT_RENDAH (< 10) ·
 * NO_DATA (no linked production for the selected view, or unknown parcel area).
 */
export type ProductivityClass = "TINGGI" | "SEDANG" | "RENDAH" | "SANGAT_RENDAH" | "NO_DATA";

/** Productivity of one parcel for a selected view (a year or the cross-year average). */
export type BmpParcelProductivity = {
  /** Ton/Ha for the view, or null when it cannot be computed (→ NO_DATA). */
  tonHa: number | null;
  cls: ProductivityClass;
  /** Periods with data in the selected year (0–12); for AVG, total periods across years. */
  monthsReported: number;
  /** Distinct years with data contributing to the view (0 or 1 for a year view). */
  yearsReported: number;
};

/** Client-side productivity coloring state for the whole loaded dataset. */
export type BmpProductivityView = {
  view: number | "AVG";
  /** Distinct years with linked production across all parcels, descending. */
  years: number[];
  byParcel: Record<string, BmpParcelProductivity>;
  counts: Record<ProductivityClass, number>;
};

/** One parcel row of the productivity table (print PDF / Excel export). */
export type BmpProductivityMatrixRow = {
  id: string;
  name: string;
  farmerCode: string;
  parcelId: string;
  area: number | null;
  /** Ton/Ha per year (key = year as string); null when not computable. */
  tonHaByYear: Record<string, number | null>;
  /** Average annual Ton/Ha across reported years, or null. */
  avg: number | null;
};

/** The productivity table: year columns (ascending) + parcel rows sorted by farmer name. */
export type BmpProductivityMatrix = {
  years: number[];
  rows: BmpProductivityMatrixRow[];
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
