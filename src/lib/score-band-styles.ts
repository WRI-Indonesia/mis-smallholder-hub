// Satu sumber gaya warna band skor untuk card, bar chart, dan matriks —
// ambangnya (100 / 80–99 / 50–79 / <50) dihitung oleh `scoreBand` di lib agregasi.

import { BAND_THRESHOLDS, scoreBand } from "@/lib/data-availability-aggregation";
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

// Sel matriks DA-03 tidak lagi memakai kelas band diskret — sejak #352 putaran 4
// warnanya dari skala kontinu `src/lib/score-heat.ts` (jangkar pada ambang band
// yang sama; 100 = emerald-800 seperti `BAND_BAR.full`).

const T = BAND_THRESHOLDS;
export const BAND_LEGEND: { band: AvailabilityScoreBand; label: string }[] = [
  { band: "full", label: `${T.full} — lengkap penuh` },
  { band: "good", label: `${T.good}–${T.full - 1} — baik` },
  { band: "warn", label: `${T.warn}–${T.good - 1} — perlu perhatian` },
  { band: "bad", label: `<${T.warn} — kritis` },
];

/** Label band per kunci — satu sumber (review #352 putaran 4: sebelumnya tiga salinan di DA-02/DA-03/hero). */
export const BAND_LABEL: Record<AvailabilityScoreBand, string> = Object.fromEntries(BAND_LEGEND.map((l) => [l.band, l.label])) as Record<
  AvailabilityScoreBand,
  string
>;

/** Label band untuk sebuah skor, mis. "50–79 — perlu perhatian". */
export const bandLabel = (score: number) => BAND_LABEL[scoreBand(score)];
