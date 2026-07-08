import type {
  DashboardData,
  DashboardPackageCode,
  DashboardSnapshotData,
  DashboardStats,
  KTDetails,
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
  locationLat: number | null;
  locationLong: number | null;
}

export interface RawFarmer {
  id: string;
  farmerGroupId: string;
  gender: "M" | "F";
  landParcels: { area: number | null }[];
  trainingParticipants: {
    activity: { isActive: boolean; package: { code: string } };
  }[];
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
    const coverage = emptyCounts();
    let totalParcels = 0;
    let totalArea = 0;
    let totalFarmersMale = 0;
    let totalFarmersFemale = 0;

    for (const f of groupFarmers) {
      if (f.gender === "M") totalFarmersMale += 1;
      else if (f.gender === "F") totalFarmersFemale += 1;
      totalParcels += f.landParcels.length;
      totalArea += f.landParcels.reduce((sum, p) => sum + (p.area ?? 0), 0);
      for (const code of farmerPackageCodes(f)) coverage[code] += 1;
    }

    return {
      id: g.id,
      name: g.name,
      code: g.code,
      locationLat: g.locationLat,
      locationLong: g.locationLong,
      totalFarmers: groupFarmers.length,
      totalFarmersMale,
      totalFarmersFemale,
      totalParcels,
      totalArea: round2(totalArea),
      trainingCoverage: coverage,
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
