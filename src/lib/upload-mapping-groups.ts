/**
 * Kelompok field pemetaan kolom Upload Massal (#420) — data murni, dijaga
 * `upload-mapping-groups.test.ts`: setiap field parser muncul TEPAT di satu
 * grup (field yang lupa dikelompokkan tak bisa dipetakan sama sekali).
 * Petani & Produksi (≤ 8 field) sengaja tanpa grup — daftar ringkas saja.
 */
export interface MappingGroup {
  key: string;
  title: string;
  fields: readonly string[];
}

/** Bulk Upload › Lahan › Detail Lahan (20 field). Bawaan NKT dirender di grup `nkt`. */
export const PARCEL_DETAIL_MAPPING_GROUPS: readonly MappingGroup[] = [
  { key: "identity", title: "Identitas", fields: ["parcelId", "farmerId"] },
  { key: "legal", title: "Legalitas", fields: ["documentType", "documentNumber", "holderName", "statedArea", "stdbNumber", "externalCode"] },
  { key: "group", title: "Kelompok & Blok", fields: ["subGroupLv2", "blok"] },
  { key: "border", title: "Sepadan (U · T · S · B)", fields: ["borderNorth", "borderEast", "borderSouth", "borderWest"] },
  { key: "nkt", title: "NKT", fields: ["nktStatus", "nktCategories", "nktAreaHa", "nktLengthM", "nktAssessedAt", "nktAssessor"] },
];

/** Bulk Upload › Lahan › Poligon (14 atribut DBF). */
export const PARCEL_POLYGON_MAPPING_GROUPS: readonly MappingGroup[] = [
  { key: "identity", title: "Identitas", fields: ["parcelId", "farmerId"] },
  { key: "attr", title: "Atribut lahan", fields: ["area", "landStatus", "cropType", "plantingYear", "revision", "notes"] },
  { key: "group", title: "Kelompok & Blok", fields: ["subGroupLv2", "blok"] },
  { key: "border", title: "Sepadan (U · T · S · B)", fields: ["borderNorth", "borderEast", "borderSouth", "borderWest"] },
];

/** Bulk Upload › Lahan › Patok (11 field). */
export const MARKER_MAPPING_GROUPS: readonly MappingGroup[] = [
  { key: "identity", title: "Lahan & koordinat", fields: ["parcelId", "farmerCode", "latitude", "longitude"] },
  { key: "marker", title: "Nomor patok", fields: ["code", "sequenceNo"] },
  { key: "install", title: "Kondisi & pemasangan", fields: ["condition", "type", "installedAt", "installedBy", "notes"] },
];

/** Contoh nilai sel untuk ditampilkan di samping pilihan kolom (ringkas, satu baris). */
export function formatSampleValue(value: unknown, max = 28): string {
  if (value == null) return "";
  let text: string;
  if (value instanceof Date) {
    text = Number.isNaN(value.getTime())
      ? ""
      : `${String(value.getUTCDate()).padStart(2, "0")}/${String(value.getUTCMonth() + 1).padStart(2, "0")}/${value.getUTCFullYear()}`;
  } else if (typeof value === "object") {
    // Sel exceljs: rich text / hyperlink / rumus → teks yang terlihat.
    const v = value as { richText?: { text: string }[]; text?: unknown; result?: unknown };
    if (Array.isArray(v.richText)) text = v.richText.map((r) => r.text).join("");
    else if (v.text != null) text = String(v.text);
    else if (v.result != null) text = String(v.result);
    else text = "";
  } else {
    text = String(value);
  }
  text = text.replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
