// Satu sumber gaya warna band skor untuk card, bar chart, dan matriks —
// ambangnya (100 / 80–99 / 50–79 / <50) dihitung oleh `scoreBand` di lib agregasi.

import type { AvailabilityScoreBand } from "@/types/dashboard";

export const BAND_BAR: Record<AvailabilityScoreBand, string> = {
  full: "bg-emerald-800 dark:bg-emerald-400",
  good: "bg-emerald-500",
  warn: "bg-amber-400",
  bad: "bg-rose-500",
};

export const BAND_TEXT: Record<AvailabilityScoreBand, string> = {
  full: "text-emerald-700 dark:text-emerald-400",
  good: "text-emerald-600",
  warn: "text-amber-600",
  bad: "text-rose-600",
};

// Sel dibuat kontras antar-band (bukan pastel seragam): tuntas = hijau tua
// pekat, baik = hijau jelas, perlu perhatian = amber jelas, kritis = merah pekat.
export const BAND_CELL: Record<AvailabilityScoreBand, string> = {
  full: "bg-emerald-800 text-white dark:bg-emerald-400 dark:text-emerald-950",
  good: "bg-emerald-300 text-emerald-950 dark:bg-emerald-800/70 dark:text-emerald-100",
  warn: "bg-amber-300 text-amber-950 dark:bg-amber-600/60 dark:text-amber-50",
  bad: "bg-rose-500 text-white dark:bg-rose-700 dark:text-rose-50",
};

export const BAND_LEGEND: { band: AvailabilityScoreBand; label: string }[] = [
  { band: "full", label: "100 — lengkap penuh" },
  { band: "good", label: "80–99 — baik" },
  { band: "warn", label: "50–79 — perlu perhatian" },
  { band: "bad", label: "<50 — kritis" },
];
