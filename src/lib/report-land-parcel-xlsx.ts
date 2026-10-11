import ExcelJS from "exceljs";
import { fillWorksheet, type ExportColumn } from "@/lib/xlsx";

/** Satu bentuk kolom dengan ekspor lain (TD-044; review #412: bukan deklarasi ulang). */
export type LpExcelColumn = ExportColumn;

export interface LpExcelImage {
  /** PNG murni (tanpa prefix data URL). */
  base64: string;
  widthPx: number;
  heightPx: number;
}

export interface LpExcelInput {
  filename: string;
  columns: LpExcelColumn[];
  /** Seluruh baris (sheet "Lahan"), termasuk baris Total bila ada. */
  fullData: Record<string, string | number>[];
  /** Gambar peta index/ikhtisar — ditempel di kanan tabel sheet "Lahan". */
  overviewImage?: LpExcelImage | null;
  /** Satu sheet per sel grid berisi subset baris + gambar peta selnya. */
  cellSheets?: { label: string; data: Record<string, string | number>[]; image?: LpExcelImage | null }[];
  /** Satu sheet per Kelompok Tani / Blok (#371) + gambar peta grup — nama disanitasi `safeSheetName`. */
  groupSheets?: { label: string; data: Record<string, string | number>[]; image?: LpExcelImage | null }[];
  /**
   * Filter aktif + ringkasan legalitas (#305). Dirender sebagai sheet
   * **"Ringkasan" tersendiri di posisi pertama**, bukan baris catatan di atas
   * tabel: menyisipkan baris di atas header membuat data tak lagi mulai di
   * baris 1, dan itu merusak AutoFilter/pivot — kebiasaan utama pengguna Excel.
   * Tanpa sheet ini, ekspor hasil filter "tanpa surat" terbaca seperti roster
   * lengkap begitu berkasnya beredar lepas dari layarnya.
   */
  infoSheet?: LpExcelInfoRow[];
}

export interface LpExcelInfoRow {
  section: string;
  label: string;
  value: string;
  note?: string;
}

const SHEET_NAME_MAX = 31;

/**
 * Nama sheet yang sah di Excel (#371): tanpa `[ ] : * ? / \`, tanpa apostrof di
 * ujung, ≤ 31 karakter (nama panjang dipendekkan dengan "…"), unik tak peka
 * huruf besar-kecil terhadap `used` (yang ikut diperbarui) — bentrok diberi
 * akhiran " (2)", " (3)" … yang tetap muat. Nama KT/Blok bebas diketik
 * pengguna, dan ExcelJS melempar galat untuk nama tak sah.
 */
export function safeSheetName(label: string, used: Set<string>): string {
  const clean = label.replace(/[[\]:*?/\\]/g, " ").replace(/\s+/g, " ").trim().replace(/^'+|'+$/g, "").trim() || "Sheet";
  const build = (suffix: string) => {
    const room = SHEET_NAME_MAX - suffix.length;
    return `${clean.length <= room ? clean : `${clean.slice(0, room - 1).trimEnd()}…`}${suffix}`;
  };
  let name = build("");
  for (let n = 2; used.has(name.toLowerCase()); n++) name = build(` (${n})`);
  used.add(name.toLowerCase());
  return name;
}

function addSheetImage(
  wb: ExcelJS.Workbook,
  ws: ExcelJS.Worksheet,
  image: LpExcelImage,
  anchorCol: number,
) {
  const imageId = wb.addImage({ base64: image.base64, extension: "png" });
  ws.addImage(imageId, {
    tl: { col: anchorCol, row: 1 },
    ext: { width: image.widthPx, height: image.heightPx },
  });
}

/**
 * Workbook Laporan Lahan ber-gambar peta (#179): sheet "Lahan" = tabel penuh +
 * gambar peta index di kanan tabel; satu sheet "Peta <sel>" per sel grid berisi
 * subset baris sel itu + gambar petanya. Build dipisah dari download agar bisa
 * diverifikasi unit test (pola build-vs-save PDF).
 */
export function buildLandParcelWorkbook({
  columns,
  fullData,
  overviewImage,
  cellSheets = [],
  groupSheets = [],
  infoSheet = [],
}: Omit<LpExcelInput, "filename">): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();

  // Sheet pertama supaya jadi yang terbuka lebih dulu — ia menerangkan
  // cakupan berkas ini, dan sheet data tetap bersih (header di baris 1).
  if (infoSheet.length > 0) addInfoSheet(wb, infoSheet);

  const full = wb.addWorksheet("Lahan");
  fillWorksheet(full, columns, fullData);
  if (overviewImage) addSheetImage(wb, full, overviewImage, columns.length + 1);

  for (const cell of cellSheets) {
    const ws = wb.addWorksheet(`Peta ${cell.label}`);
    fillWorksheet(ws, columns, cell.data);
    if (cell.image) addSheetImage(wb, ws, cell.image, columns.length + 1);
  }

  // Nama tetap + sheet sel dicadangkan dulu: KT bernama "Lahan" tak boleh
  // menabrak sheet penuh.
  const used = new Set(wb.worksheets.map((w) => w.name.toLowerCase()));
  used.add("ringkasan");
  for (const g of groupSheets) {
    const ws = wb.addWorksheet(safeSheetName(g.label, used));
    fillWorksheet(ws, columns, g.data);
    if (g.image) addSheetImage(wb, ws, g.image, columns.length + 1);
  }

  return wb;
}

/** Sheet "Ringkasan": filter aktif & angka legalitas, satu baris per butir. */
function addInfoSheet(wb: ExcelJS.Workbook, rows: LpExcelInfoRow[]) {
  const ws = wb.addWorksheet("Ringkasan");
  fillWorksheet(
    ws,
    [
      { header: "Bagian", key: "section" },
      { header: "Keterangan", key: "label" },
      { header: "Nilai", key: "value" },
      { header: "Catatan", key: "note" },
    ],
    rows.map((r) => ({ section: r.section, label: r.label, value: r.value, note: r.note ?? "" })),
  );
}

export async function exportLandParcelReportExcel(input: LpExcelInput) {
  const wb = buildLandParcelWorkbook(input);
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${input.filename}.xlsx`;
  a.click();
  window.URL.revokeObjectURL(url);
}
