/**
 * Isian pengganti "kosong" pada Kelompok Tani / Blok yang diketik apa adanya
 * di data sumber — "Tidak Ada" (417 lahan di 3 Lembaga, #374), "-", dan token
 * kosong umum berkas Excel ("n/a", "null", "none", ...). SATU daftar untuk
 * penjaga input (skema Zod lahan & import Detail Lahan lewat `cleanGroupInput`)
 * dan pengelompokan Excel/peta (`parcelGroupValue`, #371/#372) — sebelumnya
 * `cleanCell` import dan `cleanGroupInput` tidak sepakat (TD-046, #412).
 * `cleanCell` (import Detail Lahan) tetap punya daftar lebih luas untuk kolom
 * STDB/surat ("belum dapat", "proses") — itu semantik "sedang diurus", bukan KT/Blok.
 */
export const EMPTY_GROUP_TOKENS = new Set([
  "tidak ada", "belum ada", "belum", "belum dapat", "dalam proses", "sedang diurus", "proses", "belum terbit", "tidak terbit",
  "n/a", "na", "null", "nil", "none", "0",
]);

/** Token kosong KT/Blok: salah satu daftar di atas (tak peka huruf besar) atau hanya tanda "-". Pencocokan Set, bukan RegExp (review #412: metakarakter). */
export function isEmptyGroupToken(value: string): boolean {
  const t = value.trim().replace(/\s+/g, " ");
  return t === "" || /^-+$/.test(t) || EMPTY_GROUP_TOKENS.has(t.toLowerCase());
}

/**
 * Nilai KT/Blok untuk DISIMPAN: trim + spasi ganda (termasuk NBSP) dirapatkan —
 * sama dengan `parcelGroupValue`, supaya "Tidak  Ada" tak lolos penjaga padahal
 * pengelompokan menganggapnya kosong (review #374); kosong/isian pengganti → null.
 */
export function cleanGroupInput(value: string): string | null {
  const t = value.trim().replace(/\s+/g, " ");
  return isEmptyGroupToken(t) ? null : t;
}
