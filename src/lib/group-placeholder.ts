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
export const EMPTY_GROUP_TOKENS = ["tidak ada", "belum ada", "n/a", "na", "null", "nil", "none"] as const;
export const EMPTY_GROUP_PLACEHOLDER = new RegExp("^(" + EMPTY_GROUP_TOKENS.map((t) => t.replace("/", "\\/")).join("|") + "|-+)$", "i");

/**
 * Nilai KT/Blok untuk DISIMPAN: trim + spasi ganda (termasuk NBSP) dirapatkan —
 * sama dengan `parcelGroupValue`, supaya "Tidak  Ada" tak lolos penjaga padahal
 * pengelompokan menganggapnya kosong (review #374); kosong/isian pengganti → null.
 */
export function cleanGroupInput(value: string): string | null {
  const t = value.trim().replace(/\s+/g, " ");
  return t && !EMPTY_GROUP_PLACEHOLDER.test(t) ? t : null;
}
