/**
 * Isian pengganti "kosong" pada Kelompok Tani / Blok yang diketik apa adanya
 * di data sumber — "Tidak Ada" (417 lahan di 3 Lembaga, #374) atau "-".
 * Satu sumber untuk penjaga input (skema Zod lahan & import Detail Lahan) dan
 * pengelompokan Excel/peta (`parcelGroupValue`, #371/#372).
 */
export const EMPTY_GROUP_PLACEHOLDER = /^(tidak ada|-+)$/i;

/**
 * Nilai KT/Blok untuk DISIMPAN: trim + spasi ganda (termasuk NBSP) dirapatkan —
 * sama dengan `parcelGroupValue`, supaya "Tidak  Ada" tak lolos penjaga padahal
 * pengelompokan menganggapnya kosong (review #374); kosong/isian pengganti → null.
 */
export function cleanGroupInput(value: string): string | null {
  const t = value.trim().replace(/\s+/g, " ");
  return t && !EMPTY_GROUP_PLACEHOLDER.test(t) ? t : null;
}
