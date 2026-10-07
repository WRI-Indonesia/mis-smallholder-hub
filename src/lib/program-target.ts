/**
 * Target kontrak / trayektori program (#403) — helper MURNI (tanpa Prisma/Next):
 * label indikator, pemetaan ke paket pelatihan, grid isian, dan perbandingan target vs
 * realisasi untuk tampilan "vs Kontrak" kartu Training Benefit per year.
 *
 * Keputusan owner 2026-10-07: target dipisah PER PAKET — satu baris per baris kartu Training
 * Benefit per year (P1 · P2 Group Dynamic · P2 HSE · P3 · petani pernah ikut ≥ 1), label
 * sama dengan kartu itu. Realisasi = penerima manfaat BARU (tahun pertama dilatih paket itu)
 * — definisi yang sama dengan Training Benefit per year (#402); baris "pernah ikut" = tahun
 * pertama ikut pelatihan APA PUN (termasuk Lainnya) dan menggantikan baris total hitungan
 * (menjumlah paket menghitung petani yang sama berkali-kali). Kolom Start ↔ kumulatif s.d.
 * tahun baseline; hanya tahun bertarget yang tampil.
 */
import type { TrainingGroupEntry, TrainingPackageCode } from "@/types/dashboard";
import { TRAINING_BENEFIT_ANY_LABEL, TRAINING_BENEFIT_LABELS } from "@/lib/training-dashboard-aggregation";

export const PROGRAM_TARGET_INDICATORS = [
  "TRAINING_P1_BMP",
  "TRAINING_P2_GROUP_DYNAMIC",
  "TRAINING_P2_HSE",
  "TRAINING_P3_GEDSI_LIVELIHOOD",
  "TRAINING_ANY",
] as const;
export type ProgramTargetIndicatorCode = (typeof PROGRAM_TARGET_INDICATORS)[number];
export type ProgramTargetPeriodCode = "BASELINE" | "ANNUAL";

/** Paket yang menjadi realisasi tiap baris; "ANY" = pelatihan apa pun (termasuk Lainnya). */
export const PROGRAM_TARGET_PACKAGE: Record<ProgramTargetIndicatorCode, TrainingPackageCode | "ANY"> = {
  TRAINING_P1_BMP: "PAKET_1_BMP_PC_RSPO_NKT",
  TRAINING_P2_GROUP_DYNAMIC: "PAKET_2_MK",
  TRAINING_P2_HSE: "PAKET_2_K3",
  TRAINING_P3_GEDSI_LIVELIHOOD: "PAKET_3_4_GEDSI_FINANCIAL_LIVELIHOOD_BUSDEV",
  TRAINING_ANY: "ANY",
};
/** Label baris = label kartu Training Benefit per year. */
export const PROGRAM_TARGET_LABELS: Record<ProgramTargetIndicatorCode, string> = {
  TRAINING_P1_BMP: TRAINING_BENEFIT_LABELS.PAKET_1_BMP_PC_RSPO_NKT!,
  TRAINING_P2_GROUP_DYNAMIC: TRAINING_BENEFIT_LABELS.PAKET_2_MK!,
  TRAINING_P2_HSE: TRAINING_BENEFIT_LABELS.PAKET_2_K3!,
  TRAINING_P3_GEDSI_LIVELIHOOD: TRAINING_BENEFIT_LABELS.PAKET_3_4_GEDSI_FINANCIAL_LIVELIHOOD_BUSDEV!,
  TRAINING_ANY: TRAINING_BENEFIT_ANY_LABEL,
};
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

/**
 * Tahun pertama tiap petani dilatih tiap paket (+ "ANY" = pelatihan apa pun), dihitung per
 * Lembaga (kunci Lembaga+petani) — sama dengan Training Benefit per year & matriks cakupan.
 */
function firstYearsByPackage(groups: TrainingGroupEntry[]): Map<TrainingPackageCode | "ANY", number[]> {
  const first = new Map<TrainingPackageCode | "ANY", Map<string, number>>();
  const note = (code: TrainingPackageCode | "ANY", key: string, y: number) => {
    const perFarmer = first.get(code) ?? first.set(code, new Map()).get(code)!;
    const prev = perFarmer.get(key);
    if (prev == null || y < prev) perFarmer.set(key, y);
  };
  for (const g of groups) {
    for (const a of g.activities) {
      const y = Number(a.date.slice(0, 4));
      for (const p of a.participants) {
        const key = `${g.id}|${p.farmerId}`;
        note(a.packageCode, key, y);
        note("ANY", key, y);
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
  key: ProgramTargetIndicatorCode;
  label: string;
  /** Start: target baseline vs kumulatif realisasi s.d. tahun baseline (null bila belum ada tahun baseline). */
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
  const first = firstYearsByPackage(groups);
  const countIn = (ind: ProgramTargetIndicatorCode, pred: (y: number) => boolean) =>
    (first.get(PROGRAM_TARGET_PACKAGE[ind]) ?? []).filter(pred).length;
  return PROGRAM_TARGET_INDICATORS.map((ind) => ({
    key: ind,
    label: PROGRAM_TARGET_LABELS[ind],
    start:
      grid.baselineYear == null
        ? null
        : cell(grid.baseline[ind] ?? null, countIn(ind, (y) => y <= grid.baselineYear!)),
    years: grid.years.map((year) => cell(grid.annual[ind]?.[year] ?? null, countIn(ind, (y) => y === year))),
  }));
}
