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
  /** Jeda bulan dari periode terakhir ke periode acuan (≥ 0); `null` tanpa record. */
  gapMonths: number | null;
  /** Periode terakhir melampaui periode acuan (salah ketik tahun / periode masa depan) — jeda dipaksa 0. */
  futureLast: boolean;
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
  // Periode masa depan → jeda negatif tidak bermakna; dipaksa 0 dan ditandai (review #416).
  const gapMonths = Number.isFinite(gap) ? Math.max(0, gap) : null;
  const futureLast = Number.isFinite(gap) && gap < 0;
  const totalRecords = valid.reduce((s, c) => s + c.records, 0);
  const estimateRecords = valid.reduce((s, c) => s + c.estimateRecords, 0);
  return {
    firstPeriod,
    lastPeriod,
    monthsByYear: dataMonthsPerYear(valid.map((c) => ({ period: c.period, kg: c.kg, linked: c.linkedRecords }))),
    gapMonths,
    futureLast,
    stale: gapMonths != null && gapMonths >= PRODUCTION_STALE_MONTHS,
    totalRecords,
    estimateRecords,
    estimatePct: totalRecords > 0 ? (estimateRecords / totalRecords) * 100 : 0,
    zeroRecords: valid.reduce((s, c) => s + c.zeroRecords, 0),
    noParcelRecords: valid.reduce((s, c) => s + c.noParcelRecords, 0),
  };
}

/**
 * Ringkasan SATU tahun (sel periode `YYYY-…`) — kolom Record/Estimasi/0 kg/tanpa
 * persil Sheet 1 Excel harus satu cakupan dengan kolom bulannya dan Sheet 2
 * (review pra-rilis v1.7.0, keputusan owner 2026-10-12: semua angka per tahun).
 */
export function summarizeYear(cells: ProductionCellStats[], year: number, referencePeriod: string): ProductionRangeSummary {
  return summarizeRange(cells.filter((c) => c.period.startsWith(`${year}-`)), referencePeriod);
}

/**
 * Catatan baris Sheet 1 bila % bulan tak bisa dihitung (penyebut lahan non-PSR = 0)
 * padahal ada record di tahun itu — sel bulan dibiarkan kosong (kolom tetap angka).
 */
export function percentUnavailableNote(nonPsrParcels: number, totalParcels: number, recordsInYear: number): string {
  if (nonPsrParcels > 0 || recordsInYear === 0) return "";
  return totalParcels > 0 ? "Semua lahan PSR — % bulan tak dihitung" : "Tanpa lahan aktif — % bulan tak dihitung";
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

/** Baris agregat Distrik (tingkat teratas pohon, usulan owner 2026-10-11): sel = jumlah sel Lembaga-Lembaganya. */
export interface ProductionAvailabilityDistrictRow {
  id: string;
  name: string;
  totalFarmers: number;
  totalParcels: number;
  nonPsrParcels: number;
  cells: ProductionCellStats[];
  groups: ProductionAvailabilityGroupRow[];
}

/** Jumlahkan sel per periode dari beberapa deretan (Lembaga → Distrik). */
export function mergeCells(lists: ProductionCellStats[][]): ProductionCellStats[] {
  const acc = new Map<string, ProductionCellStats>();
  for (const cells of lists) for (const c of cells) {
    const m = acc.get(c.period) ?? { period: c.period, parcelsReporting: 0, records: 0, linkedRecords: 0, kg: 0, zeroRecords: 0, estimateRecords: 0, noParcelRecords: 0 };
    m.parcelsReporting += c.parcelsReporting;
    m.records += c.records;
    m.linkedRecords += c.linkedRecords;
    m.kg += c.kg;
    m.zeroRecords += c.zeroRecords;
    m.estimateRecords += c.estimateRecords;
    m.noParcelRecords += c.noParcelRecords;
    acc.set(c.period, m);
  }
  return [...acc.values()].sort((a, b) => a.period.localeCompare(b.period));
}

/** Kelompokkan baris Lembaga (yang sudah difilter & diurut) per Distrik; urutan Lembaga di dalamnya dipertahankan. */
export function groupRowsByDistrict(groups: ProductionAvailabilityGroupRow[]): ProductionAvailabilityDistrictRow[] {
  const byId = new Map<string, ProductionAvailabilityDistrictRow>();
  for (const g of groups) {
    const d = byId.get(g.districtId) ?? { id: g.districtId, name: g.districtName, totalFarmers: 0, totalParcels: 0, nonPsrParcels: 0, cells: [], groups: [] };
    d.totalFarmers += g.totalFarmers;
    d.totalParcels += g.totalParcels;
    d.nonPsrParcels += g.nonPsrParcels;
    d.groups.push(g);
    byId.set(g.districtId, d);
  }
  return [...byId.values()].map((d) => ({ ...d, cells: mergeCells(d.groups.map((g) => g.cells)) }));
}

/** Kunci urut baris Lembaga/Distrik: cakupan tahun terpilih (rata-rata 12 bulan) terendah dulu, atau nama. */
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

/** Bentuk minimal baris yang bisa diurut — dipakai baris Lembaga maupun Distrik. */
export interface SortableProductionRow {
  id: string;
  name: string;
  nonPsrParcels: number;
  cells: ProductionCellStats[];
}

export function sortProductionGroups<T extends SortableProductionRow>(
  groups: T[],
  key: ProductionSortKey,
  asc: boolean,
  year: number,
  referencePeriod: string,
): T[] {
  const dir = asc ? 1 : -1;
  // Nilai urut dihitung SEKALI per baris (bukan di komparator — review #416).
  // `null` = tak bisa dinilai (tanpa lahan non-PSR / tanpa record): selalu di
  // bawah apa pun arah dan kuncinya — ia bukan "paling rendah".
  const value = new Map<string, number | null>(
    groups.map((g) => {
      if (key === "coverage") return [g.id, yearCoverageAvg(g, year)];
      const s = summarizeRange(g.cells, referencePeriod);
      if (key === "months") return [g.id, s.lastPeriod ? (s.monthsByYear[String(year)] ?? 0) : null];
      if (key === "last") return [g.id, s.lastPeriod ? monthsBetween("2000-01", s.lastPeriod) : null];
      return [g.id, 0];
    }),
  );
  return [...groups].sort((a, b) => {
    let d = 0;
    if (key === "name") d = a.name.localeCompare(b.name) * dir;
    else {
      const va = value.get(a.id) ?? null;
      const vb = value.get(b.id) ?? null;
      if (va == null && vb == null) d = 0;
      else if (va == null) d = 1;
      else if (vb == null) d = -1;
      else d = (va - vb) * dir;
    }
    return d !== 0 ? d : a.name.localeCompare(b.name);
  });
}
