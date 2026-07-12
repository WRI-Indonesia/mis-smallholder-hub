import ExcelJS from "exceljs";

export interface ExportColumn {
  header: string;
  key: string;
  width?: number;
}

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
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  worksheet.columns = columns.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width,
  }));

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FF000000" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF2F2F2" }, // Light gray
  };
  headerRow.border = {
    bottom: { style: "medium", color: { argb: "FFD3D3D3" } },
  };

  // Add data
  worksheet.addRows(data);

  // Auto-fit columns if width not specified
  worksheet.columns.forEach((column) => {
    if (!column.width) {
      let maxLen = column.header ? column.header.length : 10;
      column.eachCell?.({ includeEmpty: true }, (cell) => {
        const valStr = cell.value ? String(cell.value) : "";
        if (valStr.length > maxLen) {
          maxLen = valStr.length;
        }
      });
      column.width = Math.min(Math.max(maxLen + 3, 10), 50);
    }
  });

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

export interface ExportSheet {
  name: string;
  columns: ExportColumn[];
  data: Record<string, unknown>[];
}

export async function exportMultiSheetToExcel({
  filename,
  sheets,
}: {
  filename: string;
  sheets: ExportSheet[];
}) {
  const workbook = new ExcelJS.Workbook();

  sheets.forEach((sheet) => {
    const worksheet = workbook.addWorksheet(sheet.name);

    worksheet.columns = sheet.columns.map((col) => ({
      header: col.header,
      key: col.key,
      width: col.width,
    }));

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FF000000" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF2F2F2" }, // Light gray
    };
    headerRow.border = {
      bottom: { style: "medium", color: { argb: "FFD3D3D3" } },
    };

    // Add data
    worksheet.addRows(sheet.data);

    // Auto-fit columns if width not specified
    worksheet.columns.forEach((column) => {
      if (!column.width) {
        let maxLen = column.header ? column.header.length : 10;
        column.eachCell?.({ includeEmpty: true }, (cell) => {
          const valStr = cell.value ? String(cell.value) : "";
          if (valStr.length > maxLen) {
            maxLen = valStr.length;
          }
        });
        column.width = Math.min(Math.max(maxLen + 3, 10), 50);
      }
    });
  });

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
