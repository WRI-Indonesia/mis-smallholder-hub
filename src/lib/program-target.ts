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
import { TRAINING_BENEFIT_ANY_LABEL, TRAINING_BENEFIT_LABELS, firstTrainingYears } from "@/lib/training-dashboard-aggregation";

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
/**
 * Isian sel grid → bilangan bulat ≥ 0; `null` = kosong, `NaN` = tidak sah. Hanya angka polos
 * ("1500") atau ribuan bertitik ("1.500"); "1.5", "2.50", "1e3", "0x10" ditolak — dulu semua
 * titik dibuang sehingga "1.5" tersimpan 15 diam-diam (temuan review #403).
 */
export function parseTargetInput(s: string | undefined): number | null {
  const t = (s ?? "").trim();
  if (t === "") return null;
  if (!/^\d+$/.test(t) && !/^\d{1,3}(\.\d{3})+$/.test(t)) return NaN;
  return Number(t.replace(/\./g, ""));
}

/**
 * Aturan bentuk rencana target (temuan review #403) atas baris AKTIF hasil akhir simpan:
 * kolom tahun harus berurutan tanpa celah dan, bila ada Start, dimulai tepat setahun
 * sesudahnya. Tahun ≤ Start menghitung petani & target dua kali; celah tahun membuang
 * penerima manfaat tahun itu dari realisasi. `null` = sah.
 */
export function programTargetPlanError(records: ProgramTargetRecord[]): string | null {
  const baselineYears = [...new Set(records.filter((r) => r.periodType === "BASELINE").map((r) => r.year))];
  if (baselineYears.length > 1) return "Tahun Start of the Program harus sama untuk semua baris";
  const baseline = baselineYears[0] ?? null;
  const years = [...new Set(records.filter((r) => r.periodType === "ANNUAL").map((r) => r.year))].sort((a, b) => a - b);
  if (years.length === 0) return null;
  if (baseline != null && years[0] <= baseline) return `Kolom tahun ${years[0]} tidak boleh sama dengan atau sebelum tahun Start (${baseline})`;
  if (baseline != null && years[0] !== baseline + 1) return `Kolom tahun pertama harus ${baseline + 1} (tepat sesudah tahun Start ${baseline})`;
  const gap = years.find((y, i) => i > 0 && y !== years[i - 1] + 1);
  if (gap != null) return `Kolom tahun harus berurutan — tahun ${gap - 1} belum ada kolomnya`;
  return null;
}

export function programTargetRowTotal(grid: ProgramTargetGrid, indicator: ProgramTargetIndicatorCode): number {
  const annual = grid.annual[indicator] ?? {};
  return (grid.baseline[indicator] ?? 0) + grid.years.reduce((s, y) => s + (annual[y] ?? 0), 0);
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
 * Distrik/Lembaga — pemanggil wajib memberi catatan bila filter aktif). Tahun pertama
 * dilatih dari `firstTrainingYears` — definisi yang sama dengan Training Benefit per year,
 * termasuk mengabaikan kegiatan setelah `currentYear`.
 */
export function programContractRows(grid: ProgramTargetGrid, groups: TrainingGroupEntry[], currentYear: number): ContractRow[] {
  const first = firstTrainingYears(groups, currentYear);
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
