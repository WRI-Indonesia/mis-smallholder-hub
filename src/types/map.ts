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
