// Logika murni Ketersediaan Data › Produksi (#416): persen cakupan per sel,
// ringkasan rentang penuh per baris, daftar tahun, dan filter — tanpa Prisma
// supaya bisa diuji di env node. Definisi yang DIPAKAI ULANG, bukan disalin:
// "bulan ber-data" dari `productivity-annualize` (pembagi penyetahunan Peta BMP),
// jeda basi dari `PRODUCTION_STALE_MONTHS` (DA-02), band warna dari `scoreBand`.

import { PRODUCTION_STALE_MONTHS } from "@/lib/data-completeness-registry";
import { monthsBetween } from "@/lib/data-completeness";
import { dataMonthsPerYear, type DataMonthsByYear } from "@/lib/productivity-annualize";
import type { BmpFarmerGroupCategory } from "@/types/dashboard";
import type { ProductionAvailabilityGroupRow, ProductionCellStats } from "@/types/production-availability";

const VALID_PERIOD = /^\d{4}-(0[1-9]|1[0-2])$/;

/** 12 periode YYYY-MM satu tahun, urut Jan → Des. */
export function periodsOfYear(year: number): string[] {
  return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
}

/** Tahun dari periode YYYY-MM (NaN bila format tak dikenal). */
export const yearOfPeriod = (period: string): number => (VALID_PERIOD.test(period) ? Number(period.slice(0, 4)) : Number.NaN);

/**
 * % lahan non-PSR yang melapor (K3); `null` bila penyebut 0 (Lembaga/petani
 * tanpa lahan non-PSR — sel tak bisa dinilai, bukan 0 %). Dibatasi 100 karena
 * record bisa menunjuk lahan milik petani lain dalam Lembaga yang sama.
 */
export function coveragePct(parcelsReporting: number, nonPsrParcels: number): number | null {
  if (nonPsrParcels <= 0) return null;
  return Math.min(100, (parcelsReporting / nonPsrParcels) * 100);
}

/** Sel pada satu periode, atau `undefined` bila tidak ada record sama sekali. */
export function cellAt<T extends { period: string }>(cells: T[], period: string): T | undefined {
  return cells.find((c) => c.period === period);
}

/** Ringkasan rentang penuh satu baris (kolom kanan tabel, K4–K5). */
export interface ProductionRangeSummary {
  firstPeriod: string | null;
  lastPeriod: string | null;
  /** Bulan ber-data per tahun — aturan penyetahunan Peta BMP. */
  monthsByYear: DataMonthsByYear;
  /** Jeda bulan dari periode terakhir ke periode acuan; `null` tanpa record. */
  gapMonths: number | null;
  /** `gapMonths ≥ PRODUCTION_STALE_MONTHS` (K5-d). */
  stale: boolean;
  totalRecords: number;
  estimateRecords: number;
  /** % record berlabel Estimasi terhadap semua record; 0 bila tanpa record. */
  estimatePct: number;
  zeroRecords: number;
  noParcelRecords: number;
}

export function summarizeRange(cells: ProductionCellStats[], referencePeriod: string): ProductionRangeSummary {
  const valid = cells.filter((c) => VALID_PERIOD.test(c.period) && c.records > 0);
  const periods = valid.map((c) => c.period).sort();
  const firstPeriod = periods[0] ?? null;
  const lastPeriod = periods[periods.length - 1] ?? null;
  const gap = lastPeriod ? monthsBetween(lastPeriod, referencePeriod) : Number.NaN;
  const gapMonths = Number.isFinite(gap) ? gap : null;
  const totalRecords = valid.reduce((s, c) => s + c.records, 0);
  const estimateRecords = valid.reduce((s, c) => s + c.estimateRecords, 0);
  return {
    firstPeriod,
    lastPeriod,
    monthsByYear: dataMonthsPerYear(valid.map((c) => ({ period: c.period, kg: c.kg, linked: c.linkedRecords }))),
    gapMonths,
    stale: gapMonths != null && gapMonths >= PRODUCTION_STALE_MONTHS,
    totalRecords,
    estimateRecords,
    estimatePct: totalRecords > 0 ? (estimateRecords / totalRecords) * 100 : 0,
    zeroRecords: valid.reduce((s, c) => s + c.zeroRecords, 0),
    noParcelRecords: valid.reduce((s, c) => s + c.noParcelRecords, 0),
  };
}

/**
 * Tahun yang punya data di seluruh Lembaga, terbaru dulu. Tahun berjalan selalu
 * ikut (bawaan tampilan, K4) walau belum ada record — kalender kosong lebih
 * jujur daripada diam-diam melompat ke tahun lalu.
 */
export function availableYears(groups: { cells: { period: string; records: number }[] }[], currentYear: number): number[] {
  const years = new Set<number>([currentYear]);
  for (const g of groups) for (const c of g.cells) {
    const y = yearOfPeriod(c.period);
    if (Number.isFinite(y) && c.records > 0) years.add(y);
  }
  return [...years].sort((a, b) => b - a);
}

export interface ProductionAvailabilityFilter {
  districtId?: string | null;
  category?: BmpFarmerGroupCategory | null;
  groupId?: string | null;
  /** Cari nama / kode / singkatan / distrik Lembaga (spasi saja = tanpa pencarian). */
  query?: string;
}

export function filterProductionGroups(
  groups: ProductionAvailabilityGroupRow[],
  filter: ProductionAvailabilityFilter,
): ProductionAvailabilityGroupRow[] {
  const q = (filter.query ?? "").trim().toLowerCase();
  return groups.filter((g) => {
    if (filter.districtId && g.districtId !== filter.districtId) return false;
    if (filter.category && g.category !== filter.category) return false;
    if (filter.groupId && g.id !== filter.groupId) return false;
    if (q) {
      const hay = [g.name, g.code ?? "", g.abrv ?? "", g.districtName].join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

/** Kunci urut baris Lembaga: cakupan tahun terpilih (rata-rata 12 bulan) terendah dulu, atau nama. */
export type ProductionSortKey = "coverage" | "name" | "months" | "last";

/** Rata-rata % cakupan 12 bulan tahun terpilih (bulan tanpa record = 0; penyebut 0 → null). */
export function yearCoverageAvg(row: { cells: ProductionCellStats[]; nonPsrParcels: number }, year: number): number | null {
  if (row.nonPsrParcels <= 0) return null;
  const periods = periodsOfYear(year);
  const sum = periods.reduce((s, p) => {
    const c = cellAt(row.cells, p);
    return s + (c ? (coveragePct(c.parcelsReporting, row.nonPsrParcels) ?? 0) : 0);
  }, 0);
  return sum / periods.length;
}

export function sortProductionGroups(
  groups: ProductionAvailabilityGroupRow[],
  key: ProductionSortKey,
  asc: boolean,
  year: number,
  referencePeriod: string,
): ProductionAvailabilityGroupRow[] {
  const dir = asc ? 1 : -1;
  const summary = new Map(groups.map((g) => [g.id, summarizeRange(g.cells, referencePeriod)]));
  // Nilai tak terdefinisi (tanpa lahan non-PSR / tanpa record) selalu di bawah
  // apa pun arahnya — ia bukan "paling rendah", ia tak bisa dinilai.
  const num = (v: number | null) => (v == null ? Number.POSITIVE_INFINITY * dir : v);
  return [...groups].sort((a, b) => {
    let d = 0;
    if (key === "name") d = a.name.localeCompare(b.name) * dir;
    else if (key === "coverage") d = (num(yearCoverageAvg(a, year)) - num(yearCoverageAvg(b, year))) * dir;
    else if (key === "months") d = (num(summary.get(a.id)!.monthsByYear[String(year)] ?? 0) - num(summary.get(b.id)!.monthsByYear[String(year)] ?? 0)) * dir;
    else if (key === "last") d = ((summary.get(a.id)!.lastPeriod ?? "").localeCompare(summary.get(b.id)!.lastPeriod ?? "")) * dir;
    if (!Number.isFinite(d) || d === 0) d = a.name.localeCompare(b.name);
    return d;
  });
}
