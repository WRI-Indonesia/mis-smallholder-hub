// Skala warna kontinu untuk heatmap skor (#352 putaran 4, pilihan owner):
// gradasi merah → kuning → hijau yang titik jangkarnya ditempatkan pada ambang
// band `scoreBand` (<50 kritis · 50–79 perlu perhatian · 80–99 baik · 100 penuh),
// supaya legenda band di kartu/hero tetap "membaca" warna heatmap yang sama.
// Skor 100 memakai hijau tua terpisah (bukan ujung gradasi) — "lengkap penuh"
// adalah status, bukan sekadar nilai tertinggi.

import { scoreBand } from "@/lib/data-availability-aggregation";

export type Rgb = readonly [number, number, number];

/** Titik jangkar (skor → warna). Warna dari palet Tailwind supaya serasi dengan band. */
export const HEAT_STOPS: readonly (readonly [number, Rgb])[] = [
  [0, [185, 28, 28]], // red-700
  [25, [239, 68, 68]], // red-500
  [50, [245, 158, 11]], // amber-500
  [65, [250, 204, 21]], // yellow-400
  [80, [163, 230, 53]], // lime-400
  [92, [74, 222, 128]], // green-400
  [100, [16, 185, 129]], // emerald-500 — ujung gradasi (99,9)
];

/** Warna khusus skor 100 (emerald-800, senada `BAND_BAR.full`). */
export const HEAT_FULL: Rgb = [6, 95, 70];

const clamp = (n: number) => (Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0);

const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);

/** Warna latar untuk sebuah skor: interpolasi linear antar jangkar; 100 → HEAT_FULL. */
export function heatRgb(score: number): Rgb {
  const s = clamp(score);
  if (scoreBand(s) === "full") return HEAT_FULL;
  for (let i = 1; i < HEAT_STOPS.length; i++) {
    const [s0, c0] = HEAT_STOPS[i - 1];
    const [s1, c1] = HEAT_STOPS[i];
    if (s <= s1) {
      const t = (s - s0) / (s1 - s0);
      return [lerp(c0[0], c1[0], t), lerp(c0[1], c1[1], t), lerp(c0[2], c1[2], t)];
    }
  }
  return HEAT_STOPS[HEAT_STOPS.length - 1][1];
}

/** Luminansi relatif (WCAG) 0–1 — untuk memilih warna teks yang kontras. */
export function relativeLuminance([r, g, b]: Rgb): number {
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Ambang: latar lebih terang dari ini → teks gelap (kuning/lime/hijau muda), selainnya putih. */
export const HEAT_TEXT_LUMINANCE_THRESHOLD = 0.35;

export const rgbCss = ([r, g, b]: Rgb) => `rgb(${r} ${g} ${b})`;

/** Gaya inline sel heatmap: latar + warna teks yang kontras. */
export function heatStyle(score: number): { backgroundColor: string; color: string } {
  const rgb = heatRgb(score);
  return {
    backgroundColor: rgbCss(rgb),
    color: relativeLuminance(rgb) > HEAT_TEXT_LUMINANCE_THRESHOLD ? "rgb(28 25 23)" : "rgb(255 255 255)",
  };
}

/** CSS `linear-gradient` 0 → 99,9 untuk legenda (100 digambar sebagai swatch terpisah). */
export const HEAT_GRADIENT_CSS = `linear-gradient(to right, ${HEAT_STOPS.map(([s, c]) => `${rgbCss(c)} ${s}%`).join(", ")})`;
