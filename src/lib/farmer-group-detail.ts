// #171 — Pure aggregation for the Lembaga Petani 360° detail page.
// Kept free of Prisma/Next imports so it is directly unit-testable.

import {
  buildKelompokTaniDetailReport,
  type KtDetailRawParcel,
} from "@/lib/report-kelompok-tani-detail";
import {
  buildProductionStats,
  type AvailabilityDistribution,
  type ProductionMonthRow,
  type ProductionYearRow,
} from "@/lib/production-stats";
import type { KelompokTaniDetailReportResult } from "@/types/report";

// Agregasi produksi diekstrak ke production-stats.ts (#172, dipakai juga
// detail Petani) — alias tipe dipertahankan agar konsumen #171 tak berubah.
export type GroupProductionMonthRow = ProductionMonthRow;
export type GroupProductionYearRow = ProductionYearRow;
export type { AvailabilityDistribution };

export interface DetailRawParcel {
  /** LandParcel.id (db) — kunci ketersediaan data produksi per lahan. */
  id: string;
  area: number | null;
  subGroupLv2: string | null;
  blok: string | null;
}

export interface DetailRawFarmer {
  id: string;
  /** Kode petani human-facing (Farmer.farmerId). */
  farmerId: string;
  name: string;
  gender: "M" | "F";
  landParcels: DetailRawParcel[];
  /** Partisipasi pelatihan aktif pada activity Lembaga ini. */
  trainingParticipants: { packageCode: string }[];
  productionRecords: { parcelId: string | null; period: string; yieldKg: number }[];
}

export interface DetailRawActivity {
  id: string;
  trainingDate: Date;
  location: string | null;
  packageCode: string;
  packageName: string;
  participants: { preTestScore: number | null; postTestScore: number | null }[];
}

export interface GroupDetailSummary {
  totalFarmers: number;
  totalFarmersMale: number;
  totalFarmersFemale: number;
  farmersWithoutParcel: number;
  kelompokTaniCount: number;
  blokCount: number;
  totalParcels: number;
  totalArea: number;
  productionTotalKg: number;
  /** Tahun yang punya data produksi, urut naik. */
  productionYears: number[];
}

export interface GroupTrainingCoverage {
  code: string;
  label: string;
  covered: number;
  totalFarmers: number;
  coveragePct: number;
  /** Rata-rata skor seluruh peserta aktivitas paket ini (ber-skor saja); null bila tak ada. */
  avgPreTest: number | null;
  avgPostTest: number | null;
}

export interface GroupTrainingActivityRow {
  id: string;
  trainingDate: Date;
  location: string | null;
  packageLabel: string;
  participantCount: number;
  /** Rata-rata skor (peserta ber-skor saja); null bila tak ada skor. */
  avgPreTest: number | null;
  avgPostTest: number | null;
}

export interface FarmerGroupDetailData {
  summary: GroupDetailSummary;
  struktur: KelompokTaniDetailReportResult;
  pelatihan: {
    coverage: GroupTrainingCoverage[];
    activities: GroupTrainingActivityRow[];
  };
  produksi: {
    perYear: GroupProductionYearRow[];
    availability: AvailabilityDistribution;
  };
}

const round2 = (n: number) => parseFloat(n.toFixed(2));

function avg(scores: (number | null)[]): number | null {
  const filled = scores.filter((s): s is number => s != null);
  if (filled.length === 0) return null;
  return round2(filled.reduce((s, v) => s + v, 0) / filled.length);
}

/**
 * Susun seluruh data halaman detail Lembaga Petani dari satu set fetch ter-scope.
 * Semua input sudah difilter aktif + milik satu Lembaga oleh caller.
 */
export function buildFarmerGroupDetail(
  farmerGroupId: string,
  groupName: string,
  farmers: DetailRawFarmer[],
  activities: DetailRawActivity[],
  trainingPackages: { code: string; name: string }[]
): FarmerGroupDetailData {
  // ── Struktur kelembagaan (reuse #154) ──
  const rawParcels: KtDetailRawParcel[] = farmers.flatMap((f) =>
    f.landParcels.map((p) => ({
      farmerId: f.id,
      farmerCode: f.farmerId,
      farmerName: f.name,
      area: p.area,
      subGroupLv2: p.subGroupLv2,
    }))
  );
  const struktur = buildKelompokTaniDetailReport(farmerGroupId, groupName, rawParcels);

  // ── Summary ──
  const blokSet = new Set<string>();
  let totalArea = 0;
  let totalParcels = 0;
  for (const f of farmers) {
    for (const p of f.landParcels) {
      totalParcels += 1;
      totalArea += p.area ?? 0;
      const blok = p.blok?.trim();
      if (blok) blokSet.add(blok.toLowerCase());
    }
  }

  // ── Produksi per tahun + ketersediaan per lahan (shared, #172) ──
  const prodStats = buildProductionStats(
    farmers.flatMap((f) => f.landParcels.map((p) => ({ id: p.id, area: p.area }))),
    farmers.flatMap((f) => f.productionRecords)
  );

  // ── Pelatihan: cakupan per paket + daftar aktivitas ──
  const coverage: GroupTrainingCoverage[] = trainingPackages.map((pkg) => {
    const covered = farmers.filter((f) =>
      f.trainingParticipants.some((tp) => tp.packageCode === pkg.code)
    ).length;
    const scores = activities
      .filter((a) => a.packageCode === pkg.code)
      .flatMap((a) => a.participants);
    return {
      code: pkg.code,
      label: pkg.name,
      covered,
      totalFarmers: farmers.length,
      coveragePct: farmers.length > 0 ? round2((covered / farmers.length) * 100) : 0,
      avgPreTest: avg(scores.map((p) => p.preTestScore)),
      avgPostTest: avg(scores.map((p) => p.postTestScore)),
    };
  });

  const activityRows: GroupTrainingActivityRow[] = activities
    .map((a) => ({
      id: a.id,
      trainingDate: a.trainingDate,
      location: a.location,
      packageLabel: a.packageName,
      participantCount: a.participants.length,
      avgPreTest: avg(a.participants.map((p) => p.preTestScore)),
      avgPostTest: avg(a.participants.map((p) => p.postTestScore)),
    }))
    .sort((a, b) => b.trainingDate.getTime() - a.trainingDate.getTime());

  return {
    summary: {
      totalFarmers: farmers.length,
      totalFarmersMale: farmers.filter((f) => f.gender === "M").length,
      totalFarmersFemale: farmers.filter((f) => f.gender === "F").length,
      farmersWithoutParcel: farmers.filter((f) => f.landParcels.length === 0).length,
      kelompokTaniCount: struktur.summary.totalKelompokTani,
      blokCount: blokSet.size,
      totalParcels,
      totalArea: round2(totalArea),
      productionTotalKg: prodStats.totalKg,
      productionYears: prodStats.years,
    },
    struktur,
    pelatihan: { coverage, activities: activityRows },
    produksi: { perYear: prodStats.perYear, availability: prodStats.availability },
  };
}
