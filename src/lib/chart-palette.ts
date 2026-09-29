/**
 * Palet kategorikal tervalidasi (skill dataviz, `references/palette.md`) —
 * satu sumber untuk grafik yang memakai slot kategorikal. Urutan slot TETAP
 * (tidak pernah diputar); warna mengikuti entitas, bukan peringkat. Pasangan
 * light/dark eksplisit: dark adalah langkah terpisah untuk surface gelap, bukan
 * pembalikan otomatis. Lolos validator pada daftar pasangan bersebelahan
 * (stack, bar, line); untuk sebaran/peta maksimal 3 slot pertama.
 */
export const CATEGORICAL = [
  { light: "#2a78d6", dark: "#3987e5" }, // 1 biru
  { light: "#eb6834", dark: "#d95926" }, // 2 oranye
  { light: "#1baf7a", dark: "#199e70" }, // 3 aqua
  { light: "#eda100", dark: "#c98500" }, // 4 kuning
  { light: "#e87ba4", dark: "#d55181" }, // 5 magenta
  { light: "#008300", dark: "#008300" }, // 6 hijau
  { light: "#4a3aa7", dark: "#9085e9" }, // 7 ungu
  { light: "#e34948", dark: "#e66767" }, // 8 merah
] as const;
