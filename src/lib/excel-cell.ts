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

const DATE_MIN_YEAR = 1900;
const DATE_MAX_YEAR = 2100;
/** Serial Excel 1910-01-01: angka lebih kecil hampir pasti tahun saja (`1971`) atau angka lain, bukan tanggal. */
const SERIAL_MIN = 3654;
// Ekor jam opsional: "00:00", "0:00:00", "12:00:00 PM", "T00:00:00.000Z", "T00:00:00+07:00".
// Tanggal dibaca SEPERTI TERTULIS — zona/offset tidak menggeser harinya.
const DATE_TIME_SUFFIX = String.raw`(?:[ T]\d{1,2}[:.]\d{2}(?:[:.]\d{2}(?:\.\d+)?)?(?:\s?[AaPp][Mm])?(?:Z|[+-]\d{2}:?\d{2})?)?`;
const DMY = new RegExp(String.raw`^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})` + DATE_TIME_SUFFIX + "$");
const YMD = new RegExp(String.raw`^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})` + DATE_TIME_SUFFIX + "$");

/** Tengah malam UTC y-m-d, atau `null` bila bukan tanggal kalender (31/02 tak digeser) / di luar 1900–2100. */
function utcDate(y: number, m: number, d: number): Date | null {
  if (y < DATE_MIN_YEAR || y > DATE_MAX_YEAR) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d ? date : null;
}

/**
 * Sel tanggal dari berkas upload (Petani, Produksi) → `Date` **tengah malam UTC**
 * — konvensi form Petani manual (`new Date("YYYY-MM-DD")`), `parseDateCell`, dan sel
 * tanggal exceljs. Baca dengan getter UTC. (Form Produksi manual masih mengirim tengah
 * malam lokal — belum diseragamkan.)
 *
 * Teks hanya diterima sebagai **`DD/MM/YYYY`** atau `YYYY-MM-DD` (pemisah `/ - .`, boleh
 * berekor jam/AM-PM/zona). `Date.parse` sengaja TIDAK dipakai: ia membaca "12/03/1971"
 * sebagai format AS (3 Desember — akar 2.213 tanggal lahir tertukar di prod, #354/#400)
 * dan menebak tanggal dari teks apa pun ("Panen 1" → 2001-01-01). Teks lain = `null`
 * (jadi error di preview), bukan ditebak.
 */
export function parseExcelDate(val: CellValue): Date | null {
  if (!val) return null;
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : utcDate(val.getUTCFullYear(), val.getUTCMonth() + 1, val.getUTCDate());
  }
  if (typeof val === "number") {
    if (val < SERIAL_MIN) return null;
    // Serial Excel (hari sejak 1899-12-30); pecahan jam dibuang.
    const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(val) * 86_400_000);
    return utcDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }
  if (typeof val !== "string") return null;
  const s = val.trim();
  let m = s.match(DMY);
  if (m) return utcDate(Number(m[3]), Number(m[2]), Number(m[1]));
  m = s.match(YMD);
  if (m) return utcDate(Number(m[1]), Number(m[2]), Number(m[3]));
  return null;
}
