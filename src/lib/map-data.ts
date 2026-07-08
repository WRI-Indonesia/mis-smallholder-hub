import { centroid } from "@turf/turf";
import type { Polygon, MultiPolygon } from "geojson";
import type { MapData, KTPoint, ParcelFeature } from "@/types/map";

export type RawGroup = {
  id: string;
  name: string;
  code: string | null;
  locationLat: number | null;
  locationLong: number | null;
  district: { name: string } | null;
};

export type RawParcel = {
  id: string;
  parcelId: string;
  farmerId: string;
  geometry: unknown;
  area: number | null;
  plantingYear: number | null;
  cropType: string | null;
  landStatus: string | null;
  farmer: { name: string; farmerId: string; farmerGroup: { name: string } | null } | null;
};

/**
 * Pure transform from DB rows to the map payload:
 * - KT points drop groups without coordinates.
 * - Parcels derive a centroid from their polygon; parcels with missing or
 *   invalid geometry are skipped rather than failing the whole batch.
 */
export function buildMapData(groups: RawGroup[], parcels: RawParcel[]): MapData {
  const kelompokTani: KTPoint[] = groups
    .filter((g) => g.locationLat != null && g.locationLong != null)
    .map((g) => ({
      id: g.id,
      name: g.name,
      code: g.code,
      districtName: g.district?.name ?? "—",
      lat: g.locationLat as number,
      long: g.locationLong as number,
    }));

  const parcelFeatures: ParcelFeature[] = [];
  for (const p of parcels) {
    const geometry = p.geometry as Polygon | MultiPolygon | null;
    if (!geometry) continue;
    let center: [number, number];
    try {
      const c = centroid(geometry as never).geometry.coordinates;
      if (!Number.isFinite(c[0]) || !Number.isFinite(c[1])) continue;
      center = [c[0], c[1]];
    } catch {
      continue;
    }
    parcelFeatures.push({
      id: p.id,
      parcelId: p.parcelId,
      farmerId: p.farmerId,
      farmerCode: p.farmer?.farmerId ?? "—",
      farmerName: p.farmer?.name ?? "—",
      farmerGroupName: p.farmer?.farmerGroup?.name ?? "—",
      area: p.area,
      plantingYear: p.plantingYear,
      cropType: p.cropType,
      landStatus: p.landStatus,
      centroid: center,
      geometry,
    });
  }

  return {
    kelompokTani,
    parcels: parcelFeatures,
    counts: {
      kt: kelompokTani.length,
      parcelPoints: parcelFeatures.length,
      parcelAreas: parcelFeatures.length,
    },
  };
}

/**
 * Average yield (kg) per calendar month (index 0 = Jan … 11 = Des). Records are
 * first summed per period (YYYY-MM), then averaged across the years that have
 * data for each month. Months with no data return 0.
 */
export function monthlyAverageYield(records: { period: string; yieldKg: number }[]): number[] {
  const perPeriod = new Map<string, number>();
  for (const r of records) {
    perPeriod.set(r.period, (perPeriod.get(r.period) ?? 0) + r.yieldKg);
  }
  const sums = new Array(12).fill(0);
  const counts = new Array(12).fill(0);
  for (const [period, total] of perPeriod) {
    const month = Number.parseInt(period.slice(5, 7), 10) - 1;
    if (month >= 0 && month < 12) {
      sums[month] += total;
      counts[month] += 1;
    }
  }
  return sums.map((s, i) => (counts[i] > 0 ? s / counts[i] : 0));
}
