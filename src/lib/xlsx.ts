import ExcelJS from "exceljs";

export interface ExportColumn {
  header: string;
  key: string;
  width?: number;
  /** Sel multi-baris ("\n" di nilai) — wrapText + rata atas supaya tiap baris terbaca (#331). */
  wrap?: boolean;
}

export interface ExportSheet {
  name: string;
  columns: ExportColumn[];
  data: Record<string, unknown>[];
}

/** Lebar kolom auto-fit (karakter): panjang isi terpanjang + 3, dijepit 10–50. */
export const AUTO_FIT_MIN = 10;
export const AUTO_FIT_MAX = 50;

/**
 * Satu penulis sheet untuk semua ekspor (TD-044, #412): header tebal berlatar
 * abu, baris data, wrap per kolom, auto-fit. Dipakai `exportToExcel`,
 * `exportMultiSheetToExcel`, dan Laporan Lahan (`report-land-parcel-xlsx.ts`)
 * — sebelumnya tiga salinan yang saling tertinggal (`wrap` hanya di multi-sheet).
 *
 * Auto-fit memakai DEFINISI KOLOM KITA (`col.width == null`), bukan
 * `column.width` ExcelJS yang selalu terisi lebar bawaan 9 — cabang auto-fit
 * dulu tak pernah aktif (TD-049).
 */
export function fillWorksheet(worksheet: ExcelJS.Worksheet, columns: ExportColumn[], data: Record<string, unknown>[]) {
  worksheet.columns = columns.map((col) => ({ header: col.header, key: col.key, width: col.width }));

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FF000000" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F2F2" } };
  headerRow.border = { bottom: { style: "medium", color: { argb: "FFD3D3D3" } } };

  worksheet.addRows(data);

  columns.forEach((col, i) => {
    const column = worksheet.getColumn(i + 1);
    // Kolom multi-baris: wrapText agar "\n" di nilai tampil sebagai baris, bukan satu baris panjang.
    if (col.wrap) column.alignment = { wrapText: true, vertical: "top" };
    if (col.width != null) return;
    let maxLen = col.header ? col.header.length : AUTO_FIT_MIN;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const valStr = cell.value ? String(cell.value) : "";
      if (valStr.length > maxLen) maxLen = valStr.length;
    });
    column.width = Math.min(Math.max(maxLen + 3, AUTO_FIT_MIN), AUTO_FIT_MAX);
  });
}

/** Unduh workbook sebagai berkas .xlsx di browser. */
export async function downloadWorkbook(workbook: ExcelJS.Workbook, filename: string) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.xlsx`;
  a.click();
  window.URL.revokeObjectURL(url);
}

export async function exportMultiSheetToExcel({ filename, sheets }: { filename: string; sheets: ExportSheet[] }) {
  const workbook = new ExcelJS.Workbook();
  for (const sheet of sheets) fillWorksheet(workbook.addWorksheet(sheet.name), sheet.columns, sheet.data);
  await downloadWorkbook(workbook, filename);
}

/** Satu sheet = `exportMultiSheetToExcel` dengan satu entri (TD-044). */
export async function exportToExcel({
  filename,
  sheetName = "Data",
  columns,
  data,
}: {
  filename: string;
  sheetName?: string;
  columns: ExportColumn[];
  data: Record<string, unknown>[];
}) {
  await exportMultiSheetToExcel({ filename, sheets: [{ name: sheetName, columns, data }] });
}
