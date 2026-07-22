/**
 * Pure helpers untuk bulk-upload Lahan (Shapefile ZIP) — auto-mapping atribut
 * `.dbf` ke field `LandParcel` + normalisasi nilai. Dipisah dari komponen client
 * agar dapat di-unit-test (mapping atribut → field + null-handling).
 */

/** Alias atribut shapefile (lowercase) → key field `LandParcel`. */
export const PARCEL_AUTO_MATCH_RULES: Record<string, string[]> = {
  parcelId: ["parcel_id", "parcelid", "lahan_id", "id lahan", "id_lahan", "id", "parcel_code", "kode_lahan", "kd_lahan"],
  farmerId: ["farmer_id", "farmerid", "petani_id", "id petani", "id_petani", "farmer_code", "kode_petani", "wri_id", "farmer"],
  area: ["area", "area_ha", "luas", "luas_ha", "hectares", "hektar", "size"],
  landStatus: ["land_status", "landstatus", "status", "kepemilikan", "status_lahan"],
  cropType: ["crop_type", "croptype", "crop", "komoditas", "tanaman", "commodity"],
  plantingYear: ["planting_year", "plantingyear", "tahun_tanam", "thn_tanam", "tanam", "year"],
  revision: ["revision", "revisi", "rev"],
  notes: ["notes", "note", "keterangan", "ket", "catatan"],
  // Kelompok Tani per-lahan interim (#146/#150). Level Gapoktan/KUD dihapus #189.
  subGroupLv2: ["kelompok_tani", "kelompoktani", "poktan", "kt", "nama_kt", "klp_tani", "sub_group_2", "subgrouplv2", "sub2"],
  blok: ["blok", "block", "blok_kebun", "blk"],
};

/**
 * Cocokkan header shapefile ke field target berdasarkan aturan alias.
 * Match case-insensitive & trim; header pertama yang cocok menang.
 */
export function autoMatchColumns(
  detectedHeaders: string[],
  fieldKeys: string[],
  rules: Record<string, string[]> = PARCEL_AUTO_MATCH_RULES,
): Record<string, string> {
  const matched: Record<string, string> = {};
  for (const key of fieldKeys) {
    const aliases = rules[key] ?? [];
    const hit = detectedHeaders.find((h) => aliases.includes(h.toLowerCase().trim()));
    if (hit) matched[key] = hit;
  }
  return matched;
}

/**
 * Normalisasi nilai atribut teks: trim; kosong/undefined/null → `null`.
 * Meredam noise typo/spasi (lihat #148: distinct KT rawan inflasi typo).
 */
export function normalizeAttr(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.toString().trim();
  return trimmed === "" ? null : trimmed;
}
