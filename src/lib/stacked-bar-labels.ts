/**
 * Penempatan angka pada stacked bar 3 segmen (dilatih · dilatih tahun lain · belum) —
 * Capaian Paket per Distrik, Dashboard Pelatihan (#205).
 *
 * Diputuskan dari lebar PIKSEL bar yang diukur, satu tempat untuk ketiga angka: dulu tiap
 * angka memakai aturannya sendiri (container query segmen hijau vs ambang persen segmen
 * abu), sehingga angka "dilatih" yang tak muat dan terdorong keluar bisa berdempetan dengan
 * angka "belum" di area abu — terbaca seolah keduanya milik segmen abu.
 *
 * Aturan: angka dilatih di dalam segmennya bila muat, kalau tidak tepat setelah batasnya;
 * angka lain hanya tampil bila ruangnya cukup TANPA menyentuh angka yang sudah ditempatkan.
 * Yang tak tampil tetap ada di tooltip.
 */

/** Perkiraan lebar teks 10px tabular (≈6px/karakter) + padding sisi segmen. */
export function barLabelWidth(text: string): number {
  return text.length * 6 + 8;
}

const GAP = 6;

export interface StackedBarLabelLayout {
  trained: "inside" | "outside" | "hidden";
  other: boolean;
  belum: boolean;
}

export function stackedBarLabelLayout(input: {
  /** Lebar bar terukur (px); 0 = belum terukur → semua angka disembunyikan. */
  widthPx: number;
  trainedPct: number;
  otherPct: number;
  trainedText: string;
  otherText: string | null;
  belumText: string | null;
}): StackedBarLabelLayout {
  const { widthPx, trainedPct, otherPct, trainedText, otherText, belumText } = input;
  if (widthPx <= 0) return { trained: "hidden", other: false, belum: false };
  const greenPx = (widthPx * Math.min(trainedPct, 100)) / 100;
  const otherPx = (widthPx * Math.min(otherPct, 100)) / 100;
  const belumPx = Math.max(0, widthPx - greenPx - otherPx);
  const wTrained = barLabelWidth(trainedText);

  let trained: StackedBarLabelLayout["trained"] = "hidden";
  if (greenPx >= wTrained) trained = "inside";
  else if (otherPx + belumPx >= wTrained) trained = "outside";

  // Ruang yang dipakai angka dilatih di luar segmennya, dihitung dari batas hijau.
  const outsideUsed = trained === "outside" ? wTrained + GAP : 0;

  // Angka "tahun lain": rata kanan di segmennya, tak boleh menimpa angka dilatih di luar.
  const other = !!otherText && otherPx >= outsideUsed + barLabelWidth(otherText);

  // Angka "belum": rata kanan di sisa bar; angka dilatih di luar yang melewati segmen tahun
  // lain memakan sebagian ruangnya.
  const usedInBelum = Math.max(0, outsideUsed - otherPx);
  const belum = !!belumText && belumPx >= usedInBelum + barLabelWidth(belumText);

  return { trained, other, belum };
}
