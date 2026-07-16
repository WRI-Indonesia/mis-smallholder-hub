// Agregasi produksi per tahun + bulanan + ketersediaan per lahan — dipakai
// detail Lembaga Petani (#171) dan detail Petani (#172). Pure (tanpa Prisma).

import { productionAvailabilityCategory } from "@/lib/map-data";

export interface ProductionStatsParcel {
  /** LandParcel.id (db) — kunci ketersediaan & luas pelapor. */
  id: string;
  area: number | null;
}

export interface ProductionStatsRecord {
  parcelId: string | null;
  /** Periode "YYYY-MM". */
  period: string;
  yieldKg: number;
}

export interface ProductionMonthRow {
  /** Periode "YYYY-MM". */
  period: string;
  totalKg: number;
  recordCount: number;
  parcelsReporting: number;
  areaReporting: number;
}

export interface ProductionYearRow {
  year: number;
  totalKg: number;
  recordCount: number;
  /**
   * Distinct pasangan lahan×bulan yang melapor pada tahun tsb — basis persen
   * kelengkapan pelaporan (mandatory: min. 1 panen/bulan per lahan), penyebutnya
   * total persil × 12 bulan.
   */
  reportedParcelMonths: number;
  /** Distinct lahan (ber-`parcelId`) yang melapor pada tahun tsb. */
  parcelsReporting: number;
  /** Σ luas lahan melapor (Ha) — penyebut produktivitas (#166). */
  areaReporting: number;
  /** Ton/Ha per tahun = Σ produksi ÷ Σ luas lahan melapor (#166); 0 bila belum ada pelapor ber-lahan. */
  productivityTonHa: number;
  /** Rincian per bulan (urut naik) — baris collapsible di bawah tahun. */
  months: ProductionMonthRow[];
}

export type AvailabilityDistribution = Record<"BAIK" | "CUKUP" | "KURANG" | "NONE", number>;

export interface ProductionStats {
  /** Per tahun, terbaru dulu. */
  perYear: ProductionYearRow[];
  /** Distribusi kategori ketersediaan per lahan (aturan MAP-02). */
  availability: AvailabilityDistribution;
  totalKg: number;
  /** Tahun ber-data, urut naik. */
  years: number[];
}

const round2 = (n: number) => parseFloat(n.toFixed(2));

/**
 * Susun statistik produksi dari lahan + record ter-scope (satu Lembaga atau
 * satu Petani). Record tanpa lahan masuk pembilang produksi (pola #166) tapi
 * tidak menambah luas pelapor maupun ketersediaan per lahan.
 */
export function buildProductionStats(
  parcels: ProductionStatsParcel[],
  records: ProductionStatsRecord[]
): ProductionStats {
  interface MonthAcc {
    totalKg: number;
    recordCount: number;
    parcelIds: Set<string>;
  }
  interface YearAcc {
    totalKg: number;
    recordCount: number;
    parcelIds: Set<string>;
    parcelMonths: Set<string>;
    months: Map<string, MonthAcc>;
  }

  const parcelArea = new Map<string, number>();
  const periodsByParcel = new Map<string, string[]>();
  for (const p of parcels) {
    parcelArea.set(p.id, p.area ?? 0);
    if (!periodsByParcel.has(p.id)) periodsByParcel.set(p.id, []);
  }

  const years = new Map<number, YearAcc>();
  let totalKg = 0;
  for (const r of records) {
    const year = parseInt(r.period.slice(0, 4), 10);
    if (Number.isNaN(year)) continue;
    const acc =
      years.get(year) ??
      {
        totalKg: 0,
        recordCount: 0,
        parcelIds: new Set<string>(),
        parcelMonths: new Set<string>(),
        months: new Map<string, MonthAcc>(),
      };
    acc.totalKg += r.yieldKg;
    acc.recordCount += 1;
    const month =
      acc.months.get(r.period) ?? { totalKg: 0, recordCount: 0, parcelIds: new Set<string>() };
    month.totalKg += r.yieldKg;
    month.recordCount += 1;
    if (r.parcelId) {
      acc.parcelIds.add(r.parcelId);
      acc.parcelMonths.add(`${r.parcelId}|${r.period}`);
      month.parcelIds.add(r.parcelId);
      periodsByParcel.get(r.parcelId)?.push(r.period);
    }
    acc.months.set(r.period, month);
    years.set(year, acc);
    totalKg += r.yieldKg;
  }

  const sumParcelArea = (ids: Set<string>) =>
    [...ids].reduce((s, id) => s + (parcelArea.get(id) ?? 0), 0);

  const perYear: ProductionYearRow[] = [...years.entries()]
    .map(([year, acc]) => {
      const areaReporting = sumParcelArea(acc.parcelIds);
      const months: ProductionMonthRow[] = [...acc.months.entries()]
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
        reportedParcelMonths: acc.parcelMonths.size,
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

  return {
    perYear,
    availability,
    totalKg: round2(totalKg),
    years: [...years.keys()].sort((a, b) => a - b),
  };
}
