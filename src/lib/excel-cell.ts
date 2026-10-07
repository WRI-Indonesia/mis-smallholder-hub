import type { CellValue } from "exceljs";

export type PrimitiveCellValue = string | number | boolean | Date | null;

/**
 * Normalisasi `CellValue` exceljs menjadi nilai primitif yang aman dirender
 * dan divalidasi. exceljs mengembalikan objek (bukan string) untuk beberapa
 * jenis sel — sel error Excel (`#N/A`, `#REF!`, dst.), rich text, hyperlink,
 * dan formula — dan objek tersebut membuat React crash bila dirender langsung
 * sebagai child (#196).
 *
 * Sel error diperlakukan sebagai kosong (`null`): nilainya memang bukan data,
 * melainkan sisa formula yang gagal di file sumber.
 */
export function cellValueToPrimitive(value: CellValue): PrimitiveCellValue {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value;
  if (typeof value !== "object") return value;
  if ("error" in value) return null;
  if ("richText" in value) return value.richText.map((part) => part.text).join("");
  // `text` hyperlink bisa berupa rich text (objek) — rekap Monev BMP (#344)
  // menaruh ID lahan sebagai tautan ber-rich-text; tanpa rekursi ini nilainya
  // jadi "[object Object]".
  if ("hyperlink" in value) return cellValueToPrimitive((value.text ?? value.hyperlink) as CellValue);
  if ("formula" in value || "sharedFormula" in value) {
    return cellValueToPrimitive(value.result as CellValue);
  }
  return String(value);
}

/** Tengah malam lokal y-m-d, atau `null` bila bukan tanggal kalender (31/02 tidak digeser ke Maret). */
function localDate(y: number, m: number, d: number): Date | null {
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d ? date : null;
}

/**
 * Sel tanggal dari berkas upload (Petani, Produksi) → `Date` tengah malam lokal.
 *
 * Teks angka dibaca **`DD/MM/YYYY`** (atau `YYYY-MM-DD`) SEBELUM `Date.parse`:
 * `Date.parse("12/03/1971")` memakai format AS (bulan/hari) → 3 Desember, akar
 * 2.213 tanggal lahir tertukar di prod (#354, #400). `Date.parse` hanya untuk teks
 * lain (mis. "12 March 1971").
 */
export function parseExcelDate(val: CellValue): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === "number") {
    // Serial Excel (hari sejak 1899-12-30).
    const info = new Date(Math.floor(val - 25569) * 86400 * 1000);
    return new Date(info.getFullYear(), info.getMonth(), info.getDate());
  }
  if (typeof val !== "string") return null;
  const s = val.trim();
  let m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (m) return localDate(Number(m[3]), Number(m[2]), Number(m[1]));
  m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (m) return localDate(Number(m[1]), Number(m[2]), Number(m[3]));
  if (/^[\d\s/.-]+$/.test(s)) return null; // angka berpola lain (mis. 2 digit tahun) — jangan ditebak Date.parse
  const parsed = Date.parse(s);
  return isNaN(parsed) ? null : new Date(parsed);
}
