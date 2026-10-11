/**
 * Spesifikasi template Upload Massal (#419) — data MURNI (tanpa exceljs/DOM)
 * agar teruji: tiap tajuk/atribut template harus terpetakan otomatis oleh
 * parser fiturnya (`src/test/bulk-upload-templates.test.ts`). Pengunduhnya
 * ada di `bulk-upload-template-download.ts` (client-only).
 *
 * ID contoh selalu fiktif (`CTH.*`, repo publik) — bila template diunggah apa
 * adanya, barisnya ditolak "tidak terdaftar", bukan "kolom tidak dikenali".
 */
import type { Feature, Point, Polygon } from "geojson";
import { FARMER_UPLOAD_FIELDS } from "@/lib/farmer-upload-fields";
import { PRODUCTION_UPLOAD_FIELDS } from "@/lib/production-upload-fields";
import { PARCEL_UPLOAD_FIELDS } from "@/lib/parcel-bulk-mapping";

export const EXAMPLE_FARMER_ID = "CTH.14.01.10.2012.0001";
export const EXAMPLE_PARCEL_ID = "CTH.0001.A.14.01.10.2012";

type Cell = string | number | null;

export interface ExcelTemplateColumn {
  /** Tajuk persis di baris 1 — HARUS cocok alias auto-match parser. */
  header: string;
  /** Key field parser yang dituju tajuk ini. */
  field: string;
  required: boolean;
  /** Keterangan format untuk sheet "Petunjuk". */
  guide: string;
  width?: number;
  /** Format sel teks ("@") — ID/NIK/Periode: angka nol di depan & "2026-06" tak diubah Excel. */
  text?: boolean;
}

export interface ExcelTemplateSpec {
  filename: string;
  /** Sheet data selalu bernama "Data" — dibaca lebih dulu oleh `readSpreadsheetFile`. */
  columns: ExcelTemplateColumn[];
  examples: Record<string, Cell>[];
  /** Kalimat pembuka sheet "Petunjuk". */
  intro: string[];
}

export interface ShapefileTemplateAttribute {
  /** Nama atribut DBF (≤ 10 karakter) — HARUS dikenali parser. */
  name: string;
  /** Key field parser (Poligon) atau nama properti yang dibaca (Pohon). */
  field: string;
  required: boolean;
  guide: string;
}

export interface ShapefileTemplateSpec {
  /** Nama dasar berkas di dalam ZIP & nama ZIP. */
  base: string;
  geometry: "polygon" | "point";
  attributes: ShapefileTemplateAttribute[];
  features: Feature<Polygon | Point, Record<string, Cell>>[];
  intro: string[];
}

function fieldLabel<T extends readonly { key: string; label: string }[]>(fields: T, key: T[number]["key"]): string {
  return fields.find((f) => f.key === key)!.label;
}

// ─── Petani (Excel) ───

export const FARMER_TEMPLATE: ExcelTemplateSpec = {
  filename: "template_upload_petani.xlsx",
  intro: [
    "Template Upload Petani — isi sheet \"Data\" mulai baris 2 (hapus 2 baris contoh).",
    "Lembaga Petani dipilih di halaman unggah, bukan di berkas.",
    "Nama kolom berkas lapangan boleh berbeda: kolom yang tak dikenali dapat dipetakan manual sebelum validasi.",
  ],
  columns: [
    { header: fieldLabel(FARMER_UPLOAD_FIELDS, "farmerId"), field: "farmerId", required: true, guide: "ID unik petani di Lembaga, minimal 2 karakter", width: 26, text: true },
    { header: fieldLabel(FARMER_UPLOAD_FIELDS, "name"), field: "name", required: true, guide: "Nama lengkap, minimal 2 karakter", width: 26 },
    { header: fieldLabel(FARMER_UPLOAD_FIELDS, "gender"), field: "gender", required: true, guide: "L / P (atau Laki-laki / Perempuan)", width: 16 },
    { header: fieldLabel(FARMER_UPLOAD_FIELDS, "nik"), field: "nik", required: false, guide: "16 digit angka; isi sebagai TEKS agar angka nol di depan tidak hilang", width: 22, text: true },
    { header: fieldLabel(FARMER_UPLOAD_FIELDS, "birthPlace"), field: "birthPlace", required: false, guide: "Kota/kabupaten lahir", width: 18 },
    { header: fieldLabel(FARMER_UPLOAD_FIELDS, "birthDate"), field: "birthDate", required: false, guide: "DD/MM/YYYY atau YYYY-MM-DD", width: 16 },
    { header: fieldLabel(FARMER_UPLOAD_FIELDS, "address"), field: "address", required: false, guide: "Alamat/desa domisili", width: 30 },
    { header: fieldLabel(FARMER_UPLOAD_FIELDS, "joinedYear"), field: "joinedYear", required: false, guide: "Tahun 1900–2100", width: 16 },
  ],
  examples: [
    {
      farmerId: EXAMPLE_FARMER_ID, name: "Contoh Petani Satu", gender: "L", nik: "1400000000000001",
      birthPlace: "Pekanbaru", birthDate: "15/06/1980", address: "Desa Contoh", joinedYear: 2024,
    },
    {
      farmerId: "CTH.14.01.10.2012.0002", name: "Contoh Petani Dua", gender: "P", nik: null,
      birthPlace: null, birthDate: null, address: null, joinedYear: null,
    },
  ],
};

// ─── Produksi (Excel) ───

export const PRODUCTION_TEMPLATE: ExcelTemplateSpec = {
  filename: "template_upload_produksi.xlsx",
  intro: [
    "Template Upload Produksi — isi sheet \"Data\" mulai baris 2 (hapus 2 baris contoh).",
    "Satu baris = satu kali panen petani pada satu periode; ID Petani dan ID Lahan harus sudah terdaftar.",
  ],
  columns: [
    { header: fieldLabel(PRODUCTION_UPLOAD_FIELDS, "farmerId"), field: "farmerId", required: true, guide: "ID Petani terdaftar", width: 26, text: true },
    { header: fieldLabel(PRODUCTION_UPLOAD_FIELDS, "period"), field: "period", required: true, guide: "YYYY-MM (contoh 2026-06), isi sebagai teks", width: 12, text: true },
    { header: fieldLabel(PRODUCTION_UPLOAD_FIELDS, "harvestDate"), field: "harvestDate", required: true, guide: "DD/MM/YYYY; harus jatuh di bulan Periode", width: 16 },
    { header: fieldLabel(PRODUCTION_UPLOAD_FIELDS, "harvestNumber"), field: "harvestNumber", required: true, guide: "Angka bulat 1–4 (panen ke berapa di bulan itu)", width: 12 },
    { header: fieldLabel(PRODUCTION_UPLOAD_FIELDS, "yieldKg"), field: "yieldKg", required: true, guide: "Berat TBS dalam kg, lebih dari 0", width: 18 },
    { header: fieldLabel(PRODUCTION_UPLOAD_FIELDS, "parcelId"), field: "parcelId", required: false, guide: "ID Lahan terdaftar milik petani itu (opsional)", width: 28, text: true },
    { header: fieldLabel(PRODUCTION_UPLOAD_FIELDS, "notes"), field: "notes", required: false, guide: "Maks 500 karakter", width: 30 },
  ],
  examples: [
    { farmerId: EXAMPLE_FARMER_ID, period: "2026-06", harvestDate: "15/06/2026", harvestNumber: 1, yieldKg: 350.5, parcelId: EXAMPLE_PARCEL_ID, notes: "Panen pertama bulan ini" },
    { farmerId: EXAMPLE_FARMER_ID, period: "2026-06", harvestDate: "29/06/2026", harvestNumber: 2, yieldKg: 420, parcelId: EXAMPLE_PARCEL_ID, notes: null },
  ],
};

// ─── Poligon Lahan (ZIP shapefile Polygon) ───

/** Persegi ±100 m di Riau (fiktif) — cukup untuk lolos baca shpjs & pratinjau peta. */
function exampleSquare(lon: number, lat: number, d = 0.0009): Polygon {
  return { type: "Polygon", coordinates: [[[lon, lat], [lon + d, lat], [lon + d, lat + d], [lon, lat + d], [lon, lat]]] };
}

const PARCEL_ATTR: { name: string; field: (typeof PARCEL_UPLOAD_FIELDS)[number]["key"]; guide: string; example: Cell }[] = [
  { name: "parcel_id", field: "parcelId", guide: "ID Lahan unik per petani", example: EXAMPLE_PARCEL_ID },
  { name: "farmer_id", field: "farmerId", guide: "ID Petani yang sudah terdaftar", example: EXAMPLE_FARMER_ID },
  { name: "luas_ha", field: "area", guide: "Luas (ha), desimal lebih dari 0", example: 1.0 },
  { name: "status", field: "landStatus", guide: "Owned (milik sendiri) / Leased (sewa) / Shared (bagi hasil) — nilai form Lahan", example: "Owned" },
  { name: "komoditas", field: "cropType", guide: "Teks; kosong → Kelapa Sawit", example: "Kelapa Sawit" },
  { name: "thn_tanam", field: "plantingYear", guide: "Tahun 1900–2100", example: 2010 },
  { name: "poktan", field: "subGroupLv2", guide: "Nama Kelompok Tani", example: "KT Contoh" },
  { name: "blok", field: "blok", guide: "Blok kebun", example: "A1" },
  { name: "revisi", field: "revision", guide: "Angka revisi (bawaan 0)", example: 0 },
  { name: "catatan", field: "notes", guide: "Catatan tambahan", example: null },
  { name: "sepadan_u", field: "borderNorth", guide: "Sepadan utara (teks bebas)", example: "Jalan desa" },
  { name: "sepadan_t", field: "borderEast", guide: "Sepadan timur", example: null },
  { name: "sepadan_s", field: "borderSouth", guide: "Sepadan selatan", example: null },
  { name: "sepadan_b", field: "borderWest", guide: "Sepadan barat", example: null },
];

const requiredParcelKeys = new Set<string>(PARCEL_UPLOAD_FIELDS.filter((f) => f.required).map((f) => f.key));

export const PARCEL_POLYGON_TEMPLATE: ShapefileTemplateSpec = {
  base: "template_poligon_lahan",
  geometry: "polygon",
  intro: [
    "Template Upload Poligon Lahan (ZIP Shapefile: .shp .shx .dbf .prj).",
    "Buka template_poligon_lahan.shp di QGIS/ArcGIS, ganti poligon contoh dengan batas lahan Anda, isi atribut, lalu ZIP ulang keempat berkas.",
    "Sistem koordinat WGS84 (EPSG:4326). Nama atribut DBF maksimal 10 karakter; nama lain dapat dipetakan manual saat unggah.",
  ],
  attributes: PARCEL_ATTR.map((a) => ({ name: a.name, field: a.field, required: requiredParcelKeys.has(a.field), guide: a.guide })),
  features: [
    {
      type: "Feature",
      geometry: exampleSquare(101.45, 0.5),
      properties: Object.fromEntries(PARCEL_ATTR.map((a) => [a.name, a.example])),
    },
  ],
};

// ─── Pohon Sawit (ZIP shapefile Point) ───

const TREE_ATTR: { name: string; required: boolean; guide: string; example: Cell }[] = [
  { name: "parcel_id", required: true, guide: "ID Lahan terdaftar; satu ZIP boleh memuat banyak lahan", example: EXAMPLE_PARCEL_ID },
  { name: "tree_id", required: false, guide: "ID pohon (angka bulat)", example: 1 },
  { name: "no", required: false, guide: "Nomor urut pohon di lahan", example: 1 },
  { name: "category", required: false, guide: "Kategori pohon, teks bebas", example: "Produktif" },
  { name: "vigor", required: false, guide: "Indeks vigor (angka desimal)", example: 0.82 },
  { name: "source", required: false, guide: "Asal titik: auto / moved / added / verified", example: "verified" },
  { name: "model_ver", required: false, guide: "Versi model deteksi", example: null },
];

export const TREE_POINT_TEMPLATE: ShapefileTemplateSpec = {
  base: "template_pohon_sawit",
  geometry: "point",
  intro: [
    "Template Upload Pohon Sawit (ZIP Shapefile Point: .shp .shx .dbf .prj).",
    "Satu titik = satu pohon; koordinat diambil dari geometri titik (WGS84, EPSG:4326).",
    "Buka template_pohon_sawit.shp di QGIS/ArcGIS, ganti titik contoh, isi atribut, lalu ZIP ulang keempat berkas.",
  ],
  attributes: TREE_ATTR.map((a) => ({ name: a.name, field: a.name, required: a.required, guide: a.guide })),
  features: [
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [101.4505, 0.5005] },
      properties: Object.fromEntries(TREE_ATTR.map((a) => [a.name, a.example])),
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [101.4508, 0.5005] },
      properties: { ...Object.fromEntries(TREE_ATTR.map((a) => [a.name, a.example])), tree_id: 2, no: 2 },
    },
  ],
};

/** Isi BACA-SAYA.txt di dalam ZIP template shapefile. */
export function shapefileTemplateReadme(spec: ShapefileTemplateSpec): string {
  const pad = Math.max(...spec.attributes.map((a) => a.name.length)) + 2;
  const rows = (required: boolean) =>
    spec.attributes.filter((a) => a.required === required).map((a) => `  ${a.name.padEnd(pad)}${a.guide}`);
  return [
    ...spec.intro,
    "",
    "Atribut WAJIB:",
    ...rows(true),
    "",
    "Atribut opsional:",
    ...rows(false),
    "",
    `Berkas ini berisi ${spec.features.length} fitur contoh dengan ID fiktif (CTH.*) — hapus sebelum mengunggah data asli.`,
    "",
  ].join("\r\n");
}
