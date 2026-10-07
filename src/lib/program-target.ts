/**
 * Target kontrak / trayektori program (#403) — helper MURNI (tanpa Prisma/Next):
 * label indikator, pemetaan ke paket pelatihan, grid isian, dan perbandingan target vs
 * realisasi untuk tampilan "vs Kontrak" kartu Training Benefit per year.
 *
 * Keputusan owner 2026-10-07: baris 1 ↔ Paket 1, baris 2 ↔ Paket 3 & 4; realisasi =
 * penerima manfaat BARU (tahun pertama dilatih paket itu) — definisi yang sama dengan
 * Training Benefit per year (#402); kolom Start ↔ kumulatif s.d. tahun baseline; baris
 * total = jumlah kedua baris (target pun dijumlah); hanya tahun bertarget yang tampil.
 */
import type { TrainingGroupEntry, TrainingPackageCode } from "@/types/dashboard";

export const PROGRAM_TARGET_INDICATORS = ["TRAINING_BMP_GROUP_MANAGEMENT", "TRAINING_GEDSI_LIVELIHOOD"] as const;
export type ProgramTargetIndicatorCode = (typeof PROGRAM_TARGET_INDICATORS)[number];
export type ProgramTargetPeriodCode = "BASELINE" | "ANNUAL";

/** Label baris kontrak (bahasa dokumen kontrak donor). */
export const PROGRAM_TARGET_LABELS: Record<ProgramTargetIndicatorCode, string> = {
  TRAINING_BMP_GROUP_MANAGEMENT: "Training on BMP and Reg. Ag., P&C RSPO, HCV, HSE, Group Management",
  TRAINING_GEDSI_LIVELIHOOD: "Training on GEDSI, Financial Literacy, Business Development and Alternative Livelihood",
};
/** Paket yang menjadi realisasi tiap baris kontrak. */
export const PROGRAM_TARGET_PACKAGE: Record<ProgramTargetIndicatorCode, TrainingPackageCode> = {
  TRAINING_BMP_GROUP_MANAGEMENT: "PAKET_1_BMP_PC_RSPO_NKT",
  TRAINING_GEDSI_LIVELIHOOD: "PAKET_3_4_GEDSI_FINANCIAL_LIVELIHOOD_BUSDEV",
};
export const PROGRAM_TARGET_TOTAL_LABEL = "Total Farmers trained in the year";
/** Batas tahun yang masuk akal untuk isian target. */
export const PROGRAM_TARGET_YEAR_MIN = 2015;
export const PROGRAM_TARGET_YEAR_MAX = 2050;

export interface ProgramTargetRecord {
  indicator: ProgramTargetIndicatorCode;
  periodType: ProgramTargetPeriodCode;
  year: number;
  value: number;
}

/** Struktur grid: satu tahun baseline (Start) + daftar tahun target, nilai per sel. */
export interface ProgramTargetGrid {
  baselineYear: number | null;
  years: number[];
  baseline: Partial<Record<ProgramTargetIndicatorCode, number>>;
  annual: Partial<Record<ProgramTargetIndicatorCode, Record<number, number>>>;
}

export function buildProgramTargetGrid(records: ProgramTargetRecord[]): ProgramTargetGrid {
  const grid: ProgramTargetGrid = { baselineYear: null, years: [], baseline: {}, annual: {} };
  const years = new Set<number>();
  for (const r of records) {
    if (r.periodType === "BASELINE") {
      grid.baseline[r.indicator] = r.value;
      // Satu tahun baseline untuk seluruh grid — yang terbaru bila (keliru) berbeda.
      grid.baselineYear = Math.max(grid.baselineYear ?? r.year, r.year);
    } else {
      (grid.annual[r.indicator] ??= {})[r.year] = r.value;
      years.add(r.year);
    }
  }
  grid.years = [...years].sort((a, b) => a - b);
  return grid;
}

/** Total per baris kontrak = baseline + Σ target tahunan (kolom "Total" kontrak). */
export function programTargetRowTotal(grid: ProgramTargetGrid, indicator: ProgramTargetIndicatorCode): number {
  const annual = grid.annual[indicator] ?? {};
  return (grid.baseline[indicator] ?? 0) + grid.years.reduce((s, y) => s + (annual[y] ?? 0), 0);
}

/** Baris "Total Farmers trained in the year" = jumlah target kedua baris per tahun. */
export function programTargetYearTotal(grid: ProgramTargetGrid, year: number): number {
  return PROGRAM_TARGET_INDICATORS.reduce((s, ind) => s + (grid.annual[ind]?.[year] ?? 0), 0);
}

/**
 * Tahun pertama tiap petani dilatih sebuah paket, dihitung per Lembaga (kunci
 * Lembaga+petani) — sama dengan Training Benefit per year & matriks cakupan.
 */
function firstYearsByPackage(groups: TrainingGroupEntry[], codes: TrainingPackageCode[]): Map<TrainingPackageCode, number[]> {
  const first = new Map<TrainingPackageCode, Map<string, number>>(codes.map((c) => [c, new Map()]));
  for (const g of groups) {
    for (const a of g.activities) {
      const perFarmer = first.get(a.packageCode);
      if (!perFarmer) continue;
      const y = Number(a.date.slice(0, 4));
      for (const p of a.participants) {
        const key = `${g.id}|${p.farmerId}`;
        const prev = perFarmer.get(key);
        if (prev == null || y < prev) perFarmer.set(key, y);
      }
    }
  }
  return new Map([...first].map(([c, m]) => [c, [...m.values()]]));
}

export interface ContractCell {
  target: number | null;
  actual: number;
  /** actual ÷ target × 100; null bila target kosong/0. */
  pct: number | null;
}
export interface ContractRow {
  key: ProgramTargetIndicatorCode | "TOTAL";
  label: string;
  /** Start: target baseline vs kumulatif realisasi s.d. tahun baseline (null pada baris total). */
  start: ContractCell | null;
  years: ContractCell[];
}

const cell = (target: number | null, actual: number): ContractCell => ({
  target,
  actual,
  pct: target != null && target > 0 ? (actual / target) * 100 : null,
});

/**
 * Tabel vs Kontrak: target (program-wide) vs realisasi dari `groups` (mengikuti filter
 * Distrik/Lembaga — pemanggil wajib memberi catatan bila filter aktif).
 */
export function programContractRows(grid: ProgramTargetGrid, groups: TrainingGroupEntry[]): ContractRow[] {
  const first = firstYearsByPackage(groups, PROGRAM_TARGET_INDICATORS.map((i) => PROGRAM_TARGET_PACKAGE[i]));
  const countIn = (ind: ProgramTargetIndicatorCode, pred: (y: number) => boolean) =>
    (first.get(PROGRAM_TARGET_PACKAGE[ind]) ?? []).filter(pred).length;
  const rows: ContractRow[] = PROGRAM_TARGET_INDICATORS.map((ind) => ({
    key: ind,
    label: PROGRAM_TARGET_LABELS[ind],
    start:
      grid.baselineYear == null
        ? null
        : cell(grid.baseline[ind] ?? null, countIn(ind, (y) => y <= grid.baselineYear!)),
    years: grid.years.map((year) => cell(grid.annual[ind]?.[year] ?? null, countIn(ind, (y) => y === year))),
  }));
  rows.push({
    key: "TOTAL",
    label: PROGRAM_TARGET_TOTAL_LABEL,
    start: null,
    years: grid.years.map((year, i) => {
      const anyTarget = PROGRAM_TARGET_INDICATORS.some((ind) => grid.annual[ind]?.[year] != null);
      return cell(anyTarget ? programTargetYearTotal(grid, year) : null, rows.reduce((s, r) => s + r.years[i].actual, 0));
    }),
  });
  return rows;
}
