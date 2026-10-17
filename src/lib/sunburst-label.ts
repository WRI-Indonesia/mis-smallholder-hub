/**
 * Penempatan label irisan sunburst (dipakai Peta Fitur › Sunburst dan Dashboard
 * Rantai Pasok › Sunburst — review 2026-10-17: logika ini sempat tersalin di dua
 * komponen dengan konstanta berbeda). Murni, tanpa DOM; sudut dalam radian
 * dengan 0 = arah jam 12 searah jarum jam (konvensi d3-shape `arc`).
 */

export type SunburstLabel =
  | { kind: "flat"; x: number; y: number; text: string }
  | { kind: "rotated"; transform: string; text: string };

export interface SunburstLabelOptions {
  /** Panjang busur minimum (px) agar label dicetak sama sekali. */
  minRoom?: number;
  /** Taksiran lebar satu karakter (px) untuk memotong label terputar. */
  charWidth?: number;
  /** Panjang maks label mendatar (irisan sangat lebar). */
  flatMax?: number;
  /** Sudut (radian) di atas mana label dicetak mendatar, bukan diputar. */
  flatAngle?: number;
}

export function clipLabel(text: string, max: number): string {
  const m = Math.max(1, max);
  return text.length > m ? `${text.slice(0, Math.max(1, m - 1))}…` : text;
}

/**
 * Label untuk irisan [x0, x1] di radius tengah `rMid`: `null` bila busurnya
 * terlalu sempit; mendatar di tengah cincin bila irisannya sangat lebar (hampir
 * satu lingkaran — label terputar akan terbalik/terpotong); selain itu diputar
 * mengikuti jari-jari dan dibalik 180° di belahan kiri agar tak terbaca terbalik.
 */
export function sunburstLabel(x0: number, x1: number, rMid: number, text: string, opts: SunburstLabelOptions = {}): SunburstLabel | null {
  const { minRoom = 46, charWidth = 5.5, flatMax = 26, flatAngle = 1.6 } = opts;
  const angle = x1 - x0;
  const room = angle * rMid;
  if (!(room > minRoom)) return null;
  const mid = (x0 + x1) / 2;
  if (angle > flatAngle) {
    return { kind: "flat", x: rMid * Math.cos(mid - Math.PI / 2), y: rMid * Math.sin(mid - Math.PI / 2), text: clipLabel(text, flatMax) };
  }
  const deg = (mid * 180) / Math.PI - 90;
  const flip = deg > 90 ? 180 : 0;
  return { kind: "rotated", transform: `rotate(${deg}) translate(${rMid},0) rotate(${flip})`, text: clipLabel(text, Math.floor(room / charWidth)) };
}
