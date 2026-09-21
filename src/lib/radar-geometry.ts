// Geometri radar/pentagon untuk "sidik jari" Lembaga (#352 putaran 4):
// sumbu pertama tepat di atas, sumbu berikutnya searah jarum jam. Murni —
// dipakai komponen SVG dan diuji tanpa DOM.

export interface RadarFrame {
  cx: number;
  cy: number;
  /** Jari-jari nilai maksimum. */
  r: number;
}

export type RadarPoint = readonly [number, number];

/** Sudut sumbu ke-i dari n sumbu (radian; -π/2 = atas). */
export const radarAngle = (i: number, n: number) => -Math.PI / 2 + (2 * Math.PI * i) / n;

/** Titik tiap sumbu pada nilai `values[i]` (0–`max`, dijepit; NaN → 0). */
export function radarPoints(values: readonly number[], frame: RadarFrame, max = 100): RadarPoint[] {
  const n = values.length;
  return values.map((v, i) => {
    const angle = radarAngle(i, n);
    const k = Math.max(0, Math.min(max, Number.isFinite(v) ? v : 0)) / max;
    return [frame.cx + frame.r * k * Math.cos(angle), frame.cy + frame.r * k * Math.sin(angle)];
  });
}

/** Atribut `points` SVG (1 desimal supaya markup ringkas & stabil). */
export const toPointsAttr = (pts: readonly RadarPoint[]) => pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

/** Anchor teks label sumbu: tengah bila hampir vertikal, kanan/kiri sesuai sisi. */
export function radarLabelAnchor(i: number, n: number): "middle" | "start" | "end" {
  const c = Math.cos(radarAngle(i, n));
  if (Math.abs(c) < 0.2) return "middle";
  return c > 0 ? "start" : "end";
}
