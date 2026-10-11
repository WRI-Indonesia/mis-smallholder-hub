/**
 * Pure helpers untuk bulk-upload Lahan (Shapefile ZIP) — auto-mapping atribut
 * `.dbf` ke field `LandParcel` + normalisasi nilai. Dipisah dari komponen client
 * agar dapat di-unit-test (mapping atribut → field + null-handling).
 */

/** Field target Upload Poligon Lahan — dipindah dari komponen client (#419) agar template ZIP & parser satu sumber. */
export const PARCEL_UPLOAD_FIELDS = [
  { key: "parcelId", label: "ID Lahan", required: true, desc: "ID unik Lahan per petani" },
  { key: "farmerId", label: "ID Petani", required: true, desc: "ID Petani terdaftar (contoh: CTH.14.01.10.2012.0001)" },
  { key: "area", label: "Luas (ha)", required: false, desc: "Angka desimal luas hektar" },
  {
    key: "landStatus",
    label: "Status Kepemilikan",
    required: false,
    desc: "e.g. Owned, Leased, Shared",
  },
  { key: "cropType", label: "Komoditas", required: false, desc: "e.g. Kelapa Sawit, Karet" },
  { key: "plantingYear", label: "Tahun Tanam", required: false, desc: "Tahun 1900-2100" },
  { key: "subGroupLv2", label: "Kelompok Tani", required: false, desc: "Nama Kelompok Tani" },
  { key: "blok", label: "Blok", required: false, desc: "Blok kebun" },
  { key: "revision", label: "Revisi", required: false, desc: "Angka revisi (default 0)" },
  { key: "notes", label: "Catatan", required: false, desc: "Catatan tambahan" },
  // Sepadan (#326): ditulis ke satelit identitas lahan (utuh lintas revisi); sel terisi menimpa, kosong dibiarkan.
  { key: "borderNorth", label: "Sepadan Utara", required: false, desc: "Kolom DBF: bts_utara / sep_utara / utara" },
  { key: "borderEast", label: "Sepadan Timur", required: false, desc: "Kolom DBF: bts_timur / sep_timur / timur" },
  { key: "borderSouth", label: "Sepadan Selatan", required: false, desc: "Kolom DBF: bts_selatan / sep_selatan / selatan" },
  { key: "borderWest", label: "Sepadan Barat", required: false, desc: "Kolom DBF: bts_barat / sep_barat / barat" },
] as const;

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
  // Sepadan (#326) — nama kolom DBF maksimal 10 karakter, jadi alias pendek
  // (bts_utara/sep_utara) yang realistis; yang panjang untuk GeoJSON/GPKG.
  // TANPA alias satu huruf (u/t/s/b): kolom "B" (blok) atau "T" (tahun) akan
  // terpetakan ke sepadan dan menimpa data identitas lahan diam-diam (review 2026-09-14).
  borderNorth: ["bts_utara", "sep_utara", "sepadan_u", "sepadan_utara", "batas_utara", "utara", "north"],
  borderEast: ["bts_timur", "sep_timur", "sepadan_t", "sepadan_timur", "batas_timur", "timur", "east"],
  borderSouth: ["bts_selatan", "sep_selatan", "sepadan_s", "sepadan_selatan", "batas_selatan", "selatan", "south"],
  borderWest: ["bts_barat", "sep_barat", "sepadan_b", "sepadan_barat", "batas_barat", "barat", "west"],
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
