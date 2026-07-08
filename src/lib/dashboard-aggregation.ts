import type {
  DashboardData,
  DashboardPackageCode,
  DashboardSnapshotData,
  DashboardStats,
  KTDetails,
  KTYearStats,
  TrainingCounts,
} from "@/types/dashboard";

// The 4 packages shown on the dashboard — OTHER is intentionally excluded.
export const DASHBOARD_PACKAGE_CODES: DashboardPackageCode[] = [
  "PAKET_1_BMP_PC_RSPO_NKT",
  "PAKET_2_MK",
  "PAKET_2_K3",
  "PAKET_3_4_GEDSI_FINANCIAL_LIVELIHOOD_BUSDEV",
];

export interface RawGroup {
  id: string;
  name: string;
  code: string | null;
  districtId: string | null;
  districtName: string | null;
  locationLat: number | null;
  locationLong: number | null;
}

export interface RawFarmer {
  id: string;
  farmerGroupId: string;
  gender: "M" | "F";
  joinedYear: number | null;
  landParcels: { area: number | null }[];
  trainingParticipants: {
    activity: { isActive: boolean; package: { code: string } };
  }[];
}

function emptyYearStats(): KTYearStats {
  return {
    totalFarmers: 0,
    totalFarmersMale: 0,
    totalFarmersFemale: 0,
    totalParcels: 0,
    totalArea: 0,
    trainingCoverage: emptyCounts(),
  };
}

/** Accumulate one farmer's contribution into a KTYearStats bucket. */
function addFarmerToBucket(bucket: KTYearStats, f: RawFarmer): void {
  bucket.totalFarmers += 1;
  if (f.gender === "M") bucket.totalFarmersMale += 1;
  else if (f.gender === "F") bucket.totalFarmersFemale += 1;
  bucket.totalParcels += f.landParcels.length;
  bucket.totalArea += f.landParcels.reduce((sum, p) => sum + (p.area ?? 0), 0);
  for (const code of farmerPackageCodes(f)) bucket.trainingCoverage[code] += 1;
}

function emptyCounts(): TrainingCounts {
  return {
    PAKET_1_BMP_PC_RSPO_NKT: 0,
    PAKET_2_MK: 0,
    PAKET_2_K3: 0,
    PAKET_3_4_GEDSI_FINANCIAL_LIVELIHOOD_BUSDEV: 0,
  };
}

/**
 * Distinct dashboard package codes a farmer has been trained in.
 * Excludes inactive activities and the OTHER category.
 */
export function farmerPackageCodes(farmer: RawFarmer): Set<DashboardPackageCode> {
  const codes = new Set<DashboardPackageCode>();
  for (const p of farmer.trainingParticipants) {
    if (!p.activity.isActive) continue;
    const code = p.activity.package.code as DashboardPackageCode;
    if (DASHBOARD_PACKAGE_CODES.includes(code)) {
      codes.add(code);
    }
  }
  return codes;
}

function round2(n: number): number {
  return parseFloat(n.toFixed(2));
}

/**
 * Aggregate fetched groups + farmers into dashboard stats and per-KT details.
 * Pure function — all RBAC/joinedYear filtering must already be applied to the inputs.
 */
export function buildDashboardData(groups: RawGroup[], farmers: RawFarmer[]): DashboardData {
  const farmersByGroup = new Map<string, RawFarmer[]>();
  for (const f of farmers) {
    const list = farmersByGroup.get(f.farmerGroupId);
    if (list) list.push(f);
    else farmersByGroup.set(f.farmerGroupId, [f]);
  }

  const kelompokTaniList: KTDetails[] = groups.map((g) => {
    const groupFarmers = farmersByGroup.get(g.id) ?? [];
    const agg = emptyYearStats();
    const byYearBuckets: Record<string, KTYearStats> = {};

    for (const f of groupFarmers) {
      addFarmerToBucket(agg, f);
      if (f.joinedYear != null) {
        const key = String(f.joinedYear);
        byYearBuckets[key] ??= emptyYearStats();
        addFarmerToBucket(byYearBuckets[key], f);
      }
    }

    agg.totalArea = round2(agg.totalArea);
    const byYear: Record<string, KTYearStats> = {};
    for (const [key, bucket] of Object.entries(byYearBuckets)) {
      bucket.totalArea = round2(bucket.totalArea);
      byYear[key] = bucket;
    }

    return {
      id: g.id,
      name: g.name,
      code: g.code,
      districtId: g.districtId,
      districtName: g.districtName,
      locationLat: g.locationLat,
      locationLong: g.locationLong,
      ...agg,
      byYear,
    };
  });

  const trainingCounts = emptyCounts();
  let totalPetaniLaki = 0;
  let totalPetaniPerempuan = 0;
  let totalPersilLahan = 0;
  let totalLuasLahan = 0;
  for (const f of farmers) {
    if (f.gender === "M") totalPetaniLaki += 1;
    else if (f.gender === "F") totalPetaniPerempuan += 1;
    totalPersilLahan += f.landParcels.length;
    totalLuasLahan += f.landParcels.reduce((sum, p) => sum + (p.area ?? 0), 0);
    for (const code of farmerPackageCodes(f)) trainingCounts[code] += 1;
  }

  return {
    stats: {
      totalKelompokTani: groups.length,
      totalPetani: farmers.length,
      totalPetaniLaki,
      totalPetaniPerempuan,
      totalPersilLahan,
      totalLuasLahan: round2(totalLuasLahan),
      trainingCounts,
    },
    kelompokTaniList,
  };
}

/** Flatten aggregated dashboard data into the stored snapshot shape (DashboardSnapshotData). */
export function toSnapshotData(data: DashboardData): DashboardSnapshotData {
  return { ...data.stats, kelompokTaniList: data.kelompokTaniList };
}

export type SnapshotAccessScope =
  | { mode: "ALL" }
  | { mode: "BY_DISTRICT"; districtIds: string[] }
  | { mode: "BY_FARMER_GROUP"; groupIds: string[] };

/**
 * Restrict a stored snapshot's data to the viewer's data-access scope.
 * A snapshot stores per-KT `districtId`, so an org-wide snapshot can be sliced
 * down to only the KTs a limited user may see — then totals are recomputed.
 * This enforces RBAC at read time regardless of who generated the snapshot.
 */
export function scopeSnapshotData(
  data: DashboardSnapshotData,
  scope: SnapshotAccessScope
): DashboardSnapshotData {
  if (scope.mode === "ALL") return data;

  const kts =
    scope.mode === "BY_DISTRICT"
      ? data.kelompokTaniList.filter(
          (kt) => kt.districtId != null && scope.districtIds.includes(kt.districtId)
        )
      : data.kelompokTaniList.filter((kt) => scope.groupIds.includes(kt.id));

  return { ...sumKelompokTaniStats(kts), kelompokTaniList: kts };
}

/**
 * Read a snapshot's stored `data` JSON into DashboardSnapshotData, tolerating both
 * the flat shape and the older nested `{ stats, kelompokTaniList }` shape.
 */
export function normalizeSnapshotData(raw: unknown): DashboardSnapshotData {
  const obj = (raw ?? {}) as Record<string, unknown>;
  // Flat shape (current) or nested `{ stats, kelompokTaniList }` (initial bug).
  const base = (obj.trainingCounts ? obj : (obj.stats as Record<string, unknown>)) ?? {};
  const s = base as Partial<DashboardStats>;
  return {
    totalKelompokTani: s.totalKelompokTani ?? 0,
    totalPetani: s.totalPetani ?? 0,
    // Older snapshots predate gender tracking → default to 0.
    totalPetaniLaki: s.totalPetaniLaki ?? 0,
    totalPetaniPerempuan: s.totalPetaniPerempuan ?? 0,
    totalPersilLahan: s.totalPersilLahan ?? 0,
    totalLuasLahan: s.totalLuasLahan ?? 0,
    trainingCounts: s.trainingCounts ?? emptyCounts(),
    kelompokTaniList: (obj.kelompokTaniList as KTDetails[]) ?? [],
  };
}

/**
 * Resolve a KT's displayed stats for a selected joined year.
 * `year = null` → all-years aggregate; a year with no farmers → zeros.
 * Returns a KTDetails whose top-level totals reflect the chosen year.
 */
export function ktStatsForYear(kt: KTDetails, year: number | null): KTDetails {
  if (year == null) return kt;
  const y = kt.byYear?.[String(year)] ?? emptyYearStats();
  return {
    ...kt,
    totalFarmers: y.totalFarmers,
    totalFarmersMale: y.totalFarmersMale,
    totalFarmersFemale: y.totalFarmersFemale,
    totalParcels: y.totalParcels,
    totalArea: y.totalArea,
    trainingCoverage: y.trainingCoverage,
  };
}

/**
 * Recompute dashboard stats from a subset of already-aggregated KT details.
 * Used to narrow a stored snapshot to a single KT client-side (each farmer belongs
 * to exactly one KT, so summing per-KT coverage preserves distinct-farmer counts).
 */
export function sumKelompokTaniStats(kts: KTDetails[]): DashboardStats {
  const trainingCounts = emptyCounts();
  let totalPetani = 0;
  let totalPetaniLaki = 0;
  let totalPetaniPerempuan = 0;
  let totalPersilLahan = 0;
  let totalLuasLahan = 0;

  for (const kt of kts) {
    totalPetani += kt.totalFarmers;
    totalPetaniLaki += kt.totalFarmersMale ?? 0;
    totalPetaniPerempuan += kt.totalFarmersFemale ?? 0;
    totalPersilLahan += kt.totalParcels;
    totalLuasLahan += kt.totalArea;
    for (const code of DASHBOARD_PACKAGE_CODES) {
      trainingCounts[code] += kt.trainingCoverage[code];
    }
  }

  return {
    totalKelompokTani: kts.length,
    totalPetani,
    totalPetaniLaki,
    totalPetaniPerempuan,
    totalPersilLahan,
    totalLuasLahan: round2(totalLuasLahan),
    trainingCounts,
  };
}
