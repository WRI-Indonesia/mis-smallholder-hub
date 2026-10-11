/**
 * Isian pengganti "kosong" pada Kelompok Tani / Blok: HANYA "Tidak Ada" (417
 * lahan di 3 Lembaga, #374) dan "-" (keputusan owner 2026-10-12, review
 * pra-rilis v1.7.0). #412 sempat memperluasnya ke semua token kosong import
 * ("0", "na", "belum", "proses", …) — itu membuang nilai sah tanpa peringatan
 * (Blok "0", KT bersingkatan "NA"). SATU aturan untuk penjaga input (skema Zod
 * lahan, upload shapefile, import Detail Lahan — kolom KT/Blok dibaca mentah lalu
 * lewat `cleanGroupInput`) dan pengelompokan Excel/peta (`parcelGroupValue`).
 * Token STDB/surat ("belum dapat", "proses") tetap milik `cleanCell` import.
 */
export const EMPTY_GROUP_TOKENS = new Set(["tidak ada"]);

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
