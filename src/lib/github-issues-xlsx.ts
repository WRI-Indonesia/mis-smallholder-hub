import ExcelJS from "exceljs";
import { downloadWorkbook, fillWorksheet } from "@/lib/xlsx";
import { EXPORT_COLUMNS, issueExportRows, type GithubIssue } from "@/lib/github-issues";

/**
 * Workbook Daftar Issue (#429): satu sheet, kolom sama dengan laporan manual
 * `REPORTING/issue-list-*.xlsx` — tanggal sebagai sel tanggal Excel
 * (`dd/mm/yyyy`, WIB), baris judul dibekukan, autofilter.
 */
export function buildIssuesWorkbook(issues: GithubIssue[]): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Issue List", { views: [{ state: "frozen", ySplit: 1 }] });
  fillWorksheet(ws, EXPORT_COLUMNS, issueExportRows(issues));
  for (const key of ["closed", "created"]) ws.getColumn(key).numFmt = "dd/mm/yyyy";
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: issues.length + 1, column: EXPORT_COLUMNS.length } };
  return wb;
}

export async function exportIssuesToExcel(issues: GithubIssue[], filename: string) {
  await downloadWorkbook(buildIssuesWorkbook(issues), filename);
}
