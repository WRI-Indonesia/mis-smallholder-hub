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

/** One training package's completion status for a farmer (parcel popup section). */
export type FarmerTrainingItem = {
  code: string;
  label: string;
  completed: boolean;
  /** ISO date of the earliest attendance for this package, or null. */
  date: string | null;
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
  /** Monthly average yield (kg), index 0 = Jan … 11 = Des; plus totals. */
  production: { monthly: number[]; totalKg: number; recordCount: number };
};
