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
