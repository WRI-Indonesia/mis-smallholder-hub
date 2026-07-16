// #171 — Pure aggregation for the Lembaga Petani 360° detail page.
// Kept free of Prisma/Next imports so it is directly unit-testable.

import {
  buildKelompokTaniDetailReport,
  type KtDetailRawParcel,
} from "@/lib/report-kelompok-tani-detail";
import { productionAvailabilityCategory } from "@/lib/map-data";
import type { KelompokTaniDetailReportResult } from "@/types/report";

export interface DetailRawParcel {
  /** LandParcel.id (db) — kunci ketersediaan data produksi per lahan. */
  id: string;
  area: number | null;
  subGroupLv1: string | null;
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
  gapoktanCount: number;
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

export interface GroupProductionMonthRow {
  /** Periode "YYYY-MM". */
  period: string;
  totalKg: number;
  recordCount: number;
  parcelsReporting: number;
  areaReporting: number;
}

export interface GroupProductionYearRow {
  year: number;
  totalKg: number;
  recordCount: number;
  /** Distinct lahan (ber-`parcelId`) yang melapor pada tahun tsb. */
  parcelsReporting: number;
  /** Σ luas lahan melapor (Ha) — penyebut produktivitas (#166). */
  areaReporting: number;
  /** Ton/Ha per tahun = Σ produksi ÷ Σ luas lahan melapor (#166); 0 bila belum ada pelapor ber-lahan. */
  productivityTonHa: number;
  /** Rincian per bulan (urut naik) — baris collapsible di bawah tahun. */
  months: GroupProductionMonthRow[];
}

export type AvailabilityDistribution = Record<"BAIK" | "CUKUP" | "KURANG" | "NONE", number>;

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
      subGroupLv1: p.subGroupLv1,
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

  // ── Produksi per tahun + ketersediaan per lahan ──
  interface MonthAcc {
    totalKg: number;
    recordCount: number;
    parcelIds: Set<string>;
  }
  interface YearAcc {
    totalKg: number;
    recordCount: number;
    parcelIds: Set<string>;
    months: Map<string, MonthAcc>;
  }
  const years = new Map<number, YearAcc>();
  const periodsByParcel = new Map<string, string[]>();
  const parcelArea = new Map<string, number>();
  for (const f of farmers) {
    for (const p of f.landParcels) {
      parcelArea.set(p.id, p.area ?? 0);
      if (!periodsByParcel.has(p.id)) periodsByParcel.set(p.id, []);
    }
  }

  let productionTotalKg = 0;
  for (const f of farmers) {
    for (const r of f.productionRecords) {
      const year = parseInt(r.period.slice(0, 4), 10);
      if (Number.isNaN(year)) continue;
      const acc =
        years.get(year) ??
        { totalKg: 0, recordCount: 0, parcelIds: new Set<string>(), months: new Map<string, MonthAcc>() };
      acc.totalKg += r.yieldKg;
      acc.recordCount += 1;
      const month =
        acc.months.get(r.period) ?? { totalKg: 0, recordCount: 0, parcelIds: new Set<string>() };
      month.totalKg += r.yieldKg;
      month.recordCount += 1;
      // Record tanpa lahan tetap masuk pembilang produksi (pola #166),
      // tapi tidak menambah luas pelapor maupun ketersediaan per lahan.
      if (r.parcelId) {
        acc.parcelIds.add(r.parcelId);
        month.parcelIds.add(r.parcelId);
        periodsByParcel.get(r.parcelId)?.push(r.period);
      }
      acc.months.set(r.period, month);
      years.set(year, acc);
      productionTotalKg += r.yieldKg;
    }
  }

  const sumParcelArea = (ids: Set<string>) =>
    [...ids].reduce((s, id) => s + (parcelArea.get(id) ?? 0), 0);

  const perYear: GroupProductionYearRow[] = [...years.entries()]
    .map(([year, acc]) => {
      const areaReporting = sumParcelArea(acc.parcelIds);
      const months: GroupProductionMonthRow[] = [...acc.months.entries()]
        .map(([period, m]) => ({
          period,
          totalKg: round2(m.totalKg),
          recordCount: m.recordCount,
          parcelsReporting: m.parcelIds.size,
          areaReporting: round2(sumParcelArea(m.parcelIds)),
        }))
        .sort((a, b) => a.period.localeCompare(b.period));
      return {
        year,
        totalKg: round2(acc.totalKg),
        recordCount: acc.recordCount,
        parcelsReporting: acc.parcelIds.size,
        areaReporting: round2(areaReporting),
        productivityTonHa: areaReporting > 0 ? round2(acc.totalKg / 1000 / areaReporting) : 0,
        months,
      };
    })
    .sort((a, b) => b.year - a.year);

  const availability: AvailabilityDistribution = { BAIK: 0, CUKUP: 0, KURANG: 0, NONE: 0 };
  for (const periods of periodsByParcel.values()) {
    availability[productionAvailabilityCategory(periods)] += 1;
  }

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
      gapoktanCount: struktur.summary.totalGapoktan,
      blokCount: blokSet.size,
      totalParcels,
      totalArea: round2(totalArea),
      productionTotalKg: round2(productionTotalKg),
      productionYears: [...years.keys()].sort((a, b) => a - b),
    },
    struktur,
    pelatihan: { coverage, activities: activityRows },
    produksi: { perYear, availability },
  };
}
