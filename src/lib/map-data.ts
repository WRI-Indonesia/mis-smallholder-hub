import { centroid } from "@turf/turf";
import type { Polygon, MultiPolygon } from "geojson";
import type {
  MapData,
  KTPoint,
  ParcelFeature,
  ProductionSummary,
  BmpMapData,
  BmpParcelFeature,
  BmpParcelProductivity,
  BmpProductivityMatrix,
  BmpProductivityView,
  ProductionAvailabilityCategory,
  ProductivityClass,
} from "@/types/map";

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

/**
 * Summarize production records for a parcel: a cross-year monthly average plus a
 * per-year breakdown (yield summed per calendar month within each year, with the
 * year total). Years are sorted descending. Records with an unparseable period
 * are ignored (but still counted toward recordCount to mirror the raw total).
 */
export function summarizeProduction(records: { period: string; yieldKg: number }[]): ProductionSummary {
  const byYearMonth = new Map<number, number[]>();
  for (const r of records) {
    const year = Number.parseInt(r.period.slice(0, 4), 10);
    const month = Number.parseInt(r.period.slice(5, 7), 10) - 1;
    if (!Number.isFinite(year) || month < 0 || month > 11) continue;
    let monthly = byYearMonth.get(year);
    if (!monthly) {
      monthly = new Array(12).fill(0);
      byYearMonth.set(year, monthly);
    }
    monthly[month] += r.yieldKg;
  }

  const byYear = [...byYearMonth.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, monthly]) => ({ year, monthly, total: monthly.reduce((s, v) => s + v, 0) }));

  return {
    monthly: monthlyAverageYield(records),
    byYear,
    totalKg: records.reduce((s, r) => s + r.yieldKg, 0),
    recordCount: records.length,
  };
}

// ── Peta BMP — production-data availability (MAP-02) ─────────────────────────

/**
 * Category thresholds in consecutive months. Exported so the owner can retune
 * the "Baik" (> 2 years) and "Cukup" (>= 1 year) boundaries in one place.
 */
export const BMP_BAIK_MIN_MONTHS = 24; // strictly greater than → BAIK
export const BMP_CUKUP_MIN_MONTHS = 12; // at least this many → CUKUP

/**
 * Longest run of consecutive calendar months present in `periods` (YYYY-MM).
 * Duplicates are de-duplicated first; ordering does not matter. Cross-year
 * boundaries count as consecutive ("2025-12" → "2026-01"). Returns 0 for an
 * empty list. Unparseable periods are ignored.
 */
export function longestConsecutiveMonths(periods: string[]): number {
  const indices: number[] = [];
  const seen = new Set<number>();
  for (const p of periods) {
    const year = Number.parseInt(p.slice(0, 4), 10);
    const month = Number.parseInt(p.slice(5, 7), 10);
    if (!Number.isFinite(year) || month < 1 || month > 12) continue;
    const idx = year * 12 + (month - 1);
    if (!seen.has(idx)) {
      seen.add(idx);
      indices.push(idx);
    }
  }
  if (indices.length === 0) return 0;

  indices.sort((a, b) => a - b);
  let max = 1;
  let streak = 1;
  for (let i = 1; i < indices.length; i++) {
    streak = indices[i] === indices[i - 1] + 1 ? streak + 1 : 1;
    if (streak > max) max = streak;
  }
  return max;
}

/**
 * Production-data availability category of a parcel, from the longest run of
 * consecutive months in `periods` (YYYY-MM):
 *   > 24 mo  → BAIK   (above 2 years)
 *   12–24 mo → CUKUP  (at least 1 full year)
 *   1–11 mo  → KURANG (below 1 year)
 *   0        → NONE   (no records)
 */
export function productionAvailabilityCategory(
  periods: string[]
): ProductionAvailabilityCategory {
  const streak = longestConsecutiveMonths(periods);
  if (streak === 0) return "NONE";
  if (streak > BMP_BAIK_MIN_MONTHS) return "BAIK";
  if (streak >= BMP_CUKUP_MIN_MONTHS) return "CUKUP";
  return "KURANG";
}

/**
 * Pure transform for the Peta BMP payload. Each parcel is colored by its
 * production-data availability category, derived from the production attributed
 * to it via `productionByParcel` (keyed by LandParcel.id → per-period kg totals).
 * Parcels with missing or invalid geometry are skipped (they never affect
 * counts). KT points reuse the same rules as `buildMapData`.
 */
export function buildBmpMapData(
  groups: RawGroup[],
  parcels: RawParcel[],
  productionByParcel: Map<string, { period: string; kg: number }[]>
): BmpMapData {
  const kt: KTPoint[] = groups
    .filter((g) => g.locationLat != null && g.locationLong != null)
    .map((g) => ({
      id: g.id,
      name: g.name,
      code: g.code,
      districtName: g.district?.name ?? "—",
      lat: g.locationLat as number,
      long: g.locationLong as number,
    }));

  const parcelFeatures: BmpParcelFeature[] = [];
  const counts = { baik: 0, cukup: 0, kurang: 0, none: 0 };

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

    // Sum kg per period (groupBy already yields one row per period, but sum
    // defensively) → sorted unique periods drive the category & availability.
    const kgByPeriod = new Map<string, number>();
    for (const r of productionByParcel.get(p.id) ?? []) {
      kgByPeriod.set(r.period, (kgByPeriod.get(r.period) ?? 0) + r.kg);
    }
    const uniqueSorted = [...kgByPeriod.keys()].sort();
    const category = productionAvailabilityCategory(uniqueSorted);
    const streakMonths = longestConsecutiveMonths(uniqueSorted);
    const production: Record<string, number> = {};
    for (const period of uniqueSorted) production[period] = kgByPeriod.get(period) as number;

    parcelFeatures.push({
      id: p.id,
      parcelId: p.parcelId,
      farmerCode: p.farmer?.farmerId ?? "—",
      farmerName: p.farmer?.name ?? "—",
      farmerGroupName: p.farmer?.farmerGroup?.name ?? "—",
      area: p.area,
      plantingYear: p.plantingYear,
      cropType: p.cropType,
      landStatus: p.landStatus,
      centroid: center,
      geometry,
      category,
      streakMonths,
      firstPeriod: uniqueSorted[0] ?? null,
      lastPeriod: uniqueSorted[uniqueSorted.length - 1] ?? null,
      periods: uniqueSorted,
      production,
    });

    if (category === "BAIK") counts.baik++;
    else if (category === "CUKUP") counts.cukup++;
    else if (category === "KURANG") counts.kurang++;
    else counts.none++;
  }

  return { parcels: parcelFeatures, kt, counts };
}

// ── Peta BMP — produktivitas per persil (MAP-03) ─────────────────────────────

/**
 * Class thresholds in Ton/Ha per year (lower bound, inclusive). Exported so the
 * owner can retune the boundaries in one place; usulan awal 10/15/20 (#174).
 * The legend labels below derive from these, so a retune updates every surface.
 */
export const PRODUCTIVITY_TINGGI_MIN = 20;
export const PRODUCTIVITY_SEDANG_MIN = 15;
export const PRODUCTIVITY_RENDAH_MIN = 10;

/**
 * Single source of truth for productivity-class display metadata: map
 * fill/outline, panel legend, popup badge, and PDF legend/table tints all
 * derive from this list. Order = legend order (best → worst). Labels stay
 * cp1252-safe ("min.", en dash) because jsPDF's core helvetica cannot encode
 * characters like "≥".
 */
export const BMP_PRODUCTIVITY_CLASSES: {
  key: ProductivityClass;
  color: string;
  /** Short badge text (e.g. "Tinggi"). */
  short: string;
  label: string;
}[] = [
  {
    key: "TINGGI",
    color: "#16a34a",
    short: "Tinggi",
    label: `Tinggi (min. ${PRODUCTIVITY_TINGGI_MIN} Ton/Ha)`,
  },
  {
    key: "SEDANG",
    color: "#eab308",
    short: "Sedang",
    label: `Sedang (${PRODUCTIVITY_SEDANG_MIN}–${PRODUCTIVITY_TINGGI_MIN} Ton/Ha)`,
  },
  {
    key: "RENDAH",
    color: "#f97316",
    short: "Rendah",
    label: `Rendah (${PRODUCTIVITY_RENDAH_MIN}–${PRODUCTIVITY_SEDANG_MIN} Ton/Ha)`,
  },
  {
    key: "SANGAT_RENDAH",
    color: "#dc2626",
    short: "Sangat Rendah",
    label: `Sangat Rendah (< ${PRODUCTIVITY_RENDAH_MIN} Ton/Ha)`,
  },
  { key: "NO_DATA", color: "#9ca3af", short: "Tidak ada data", label: "Tidak ada data" },
];

/** Human label for a productivity view — the single derivation used by popup, panel, and print. */
export const productivityViewLabel = (view: number | "AVG") =>
  view === "AVG" ? "Rata-rata" : String(view);

/** Classify a parcel's Ton/Ha per year; null (not computable) → NO_DATA. */
export function productivityClass(tonHa: number | null): ProductivityClass {
  if (tonHa == null) return "NO_DATA";
  if (tonHa >= PRODUCTIVITY_TINGGI_MIN) return "TINGGI";
  if (tonHa >= PRODUCTIVITY_SEDANG_MIN) return "SEDANG";
  if (tonHa >= PRODUCTIVITY_RENDAH_MIN) return "RENDAH";
  return "SANGAT_RENDAH";
}

/**
 * Year sanity window for productivity views. A typo period (e.g. "2924-05" —
 * the pattern this project hit during training imports) must not become the
 * default map view or an export column.
 */
export const BMP_MIN_PRODUCTION_YEAR = 2000;
const defaultMaxProductionYear = () => new Date().getFullYear() + 1;

const isSaneProductionYear = (year: number, maxYear: number) =>
  Number.isFinite(year) && year >= BMP_MIN_PRODUCTION_YEAR && year <= maxYear;

/** Distinct sane years with linked production across parcels, descending (year dropdown). */
export function bmpProductionYears(
  parcels: { production: Record<string, number> }[],
  maxYear = defaultMaxProductionYear()
): number[] {
  const years = new Set<number>();
  for (const p of parcels) {
    for (const period of Object.keys(p.production)) {
      const year = Number.parseInt(period.slice(0, 4), 10);
      if (isSaneProductionYear(year, maxYear)) years.add(year);
    }
  }
  return [...years].sort((a, b) => b - a);
}

/**
 * Productivity of one parcel for the selected view, from its per-period kg
 * totals (only production linked to the parcel — rows without parcelId never
 * reach here) and its area in hectares.
 *
 * - Year view: Ton/Ha = Σ kg(year) ÷ 1000 ÷ area.
 * - "AVG": average annual Ton/Ha across the years the parcel reported
 *   (= Σ kg(all) ÷ 1000 ÷ yearsReported ÷ area).
 * - Missing/zero area or no data in the view → tonHa null (NO_DATA).
 * Values are as-reported: partial years are not annualized; monthsReported lets
 * the UI flag incomplete years (keputusan #174).
 */
export function parcelProductivity(
  production: Record<string, number>,
  area: number | null,
  view: number | "AVG",
  maxYear = defaultMaxProductionYear()
): Omit<BmpParcelProductivity, "cls"> {
  // Typo years are excluded here too so AVG isn't diluted by a bogus year.
  const entries = Object.entries(production).filter(([period]) =>
    isSaneProductionYear(Number.parseInt(period.slice(0, 4), 10), maxYear)
  );

  if (view === "AVG") {
    const years = new Set(entries.map(([period]) => period.slice(0, 4)));
    const yearsReported = years.size;
    const monthsReported = entries.length;
    if (area == null || area <= 0 || yearsReported === 0) {
      return { tonHa: null, monthsReported, yearsReported };
    }
    const totalKg = entries.reduce((s, [, kg]) => s + kg, 0);
    return { tonHa: totalKg / 1000 / yearsReported / area, monthsReported, yearsReported };
  }

  const inYear = entries.filter(([period]) => Number.parseInt(period.slice(0, 4), 10) === view);
  const monthsReported = inYear.length;
  const yearsReported = monthsReported > 0 ? 1 : 0;
  if (area == null || area <= 0 || monthsReported === 0) {
    return { tonHa: null, monthsReported, yearsReported };
  }
  const totalKg = inYear.reduce((s, [, kg]) => s + kg, 0);
  return { tonHa: totalKg / 1000 / area, monthsReported, yearsReported };
}

/**
 * Pure transform for the productivity coloring mode: per-parcel Ton/Ha + class
 * for the selected view, per-class counts (legend), and the year options.
 */
export function buildBmpProductivityView(
  parcels: Pick<BmpParcelFeature, "id" | "area" | "production">[],
  view: number | "AVG"
): BmpProductivityView {
  const byParcel: Record<string, BmpParcelProductivity> = {};
  const counts: Record<ProductivityClass, number> = {
    TINGGI: 0,
    SEDANG: 0,
    RENDAH: 0,
    SANGAT_RENDAH: 0,
    NO_DATA: 0,
  };
  for (const p of parcels) {
    const base = parcelProductivity(p.production, p.area, view);
    const cls = productivityClass(base.tonHa);
    byParcel[p.id] = { ...base, cls };
    counts[cls]++;
  }
  return { view, years: bmpProductionYears(parcels), byParcel, counts };
}

/**
 * Productivity table for the print PDF / Excel export: one row per parcel
 * (sorted by farmer name, matching the availability matrix), Ton/Ha per
 * available year (columns ascending) plus the cross-year average.
 */
export function buildBmpProductivityMatrix(
  parcels: Pick<
    BmpParcelFeature,
    "id" | "parcelId" | "farmerCode" | "farmerName" | "area" | "production"
  >[]
): BmpProductivityMatrix {
  const years = bmpProductionYears(parcels).slice().reverse();
  const rows = [...parcels]
    .sort((a, b) => a.farmerName.localeCompare(b.farmerName, "id"))
    .map((p) => {
      const tonHaByYear: Record<string, number | null> = {};
      for (const year of years) {
        tonHaByYear[String(year)] = parcelProductivity(p.production, p.area, year).tonHa;
      }
      return {
        id: p.id,
        name: p.farmerName,
        farmerCode: p.farmerCode,
        parcelId: p.parcelId,
        area: p.area,
        tonHaByYear,
        avg: parcelProductivity(p.production, p.area, "AVG").tonHa,
      };
    });
  return { years, rows };
}
