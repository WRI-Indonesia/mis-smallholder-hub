import ExcelJS from "exceljs";

export interface LpExcelColumn {
  header: string;
  key: string;
}

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
}

function fillSheet(
  ws: ExcelJS.Worksheet,
  columns: LpExcelColumn[],
  data: Record<string, string | number>[],
) {
  ws.columns = columns.map((c) => ({ header: c.header, key: c.key }));
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FF000000" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F2F2" } };
  headerRow.border = { bottom: { style: "medium", color: { argb: "FFD3D3D3" } } };
  ws.addRows(data);
  ws.columns.forEach((column) => {
    let maxLen = column.header ? String(column.header).length : 10;
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const valStr = cell.value ? String(cell.value) : "";
      if (valStr.length > maxLen) maxLen = valStr.length;
    });
    column.width = Math.min(Math.max(maxLen + 3, 10), 50);
  });
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
}: Omit<LpExcelInput, "filename">): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();

  const full = wb.addWorksheet("Lahan");
  fillSheet(full, columns, fullData);
  if (overviewImage) addSheetImage(wb, full, overviewImage, columns.length + 1);

  for (const cell of cellSheets) {
    const ws = wb.addWorksheet(`Peta ${cell.label}`);
    fillSheet(ws, columns, cell.data);
    if (cell.image) addSheetImage(wb, ws, cell.image, columns.length + 1);
  }

  return wb;
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
