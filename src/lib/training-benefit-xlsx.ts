import ExcelJS from "exceljs";
import type { ContractRow } from "@/lib/program-target";
import { contractTrajectory, trajectorySummary } from "@/lib/training-benefit-chart";
import type { TrainingBenefitRow, TrainingBenefitYear } from "@/lib/training-dashboard-aggregation";

/**
 * Workbook kartu Training Benefit per year (#402/#403) — tiga sheet, satu per tampilan:
 * "Tabel" (format donor), "Grafis" (angka bar + gambar), "vs Kontrak" (target vs realisasi
 * per periode + gambar 5 grafik). Tabel selalu mulai di baris 1 (AutoFilter/pivot tetap
 * jalan, pola report-land-parcel-xlsx); gambar ditempel DI BAWAH tabel. exceljs tak bisa
 * membuat grafik Excel asli → gambar PNG dari SVG yang sama dengan layar.
 */

export interface BenefitExcelImage {
  /** PNG murni (tanpa prefix data URL). */
  base64: string;
  widthPx: number;
  heightPx: number;
}

export interface BenefitExcelInput {
  years: TrainingBenefitYear[];
  rows: TrainingBenefitRow[];
  any: TrainingBenefitRow;
  activeFarmers: number;
  currentYear: number;
  /** null = target gagal dimuat / belum diisi → sheet vs Kontrak berisi pesan saja. */
  contract: { baselineYear: number | null; years: number[]; rows: ContractRow[] } | null;
  filterActive: boolean;
  images: { grafis?: BenefitExcelImage | null; kontrak?: BenefitExcelImage | null };
}

const yearLabel = (y: TrainingBenefitYear) => (y.upTo ? `≤ ${y.year}` : String(y.year));
const THIN = { style: "thin" as const };
const BORDER = { top: THIN, left: THIN, bottom: THIN, right: THIN };

function boxTable(ws: ExcelJS.Worksheet, fromRow: number, toRow: number, lastCol: number, headerRows: number) {
  for (let r = fromRow; r <= toRow; r++) {
    const row = ws.getRow(r);
    for (let c = 1; c <= lastCol; c++) row.getCell(c).border = BORDER;
    if (r < fromRow + headerRows) {
      row.font = { bold: true };
      row.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    }
  }
}

/** Gambar di bawah tabel: baris jangkar = 2 baris setelah baris terakhir tabel. */
function addImageBelow(wb: ExcelJS.Workbook, ws: ExcelJS.Worksheet, image: BenefitExcelImage) {
  const id = wb.addImage({ base64: image.base64, extension: "png" });
  ws.addImage(id, { tl: { col: 0, row: ws.rowCount + 1 }, ext: { width: image.widthPx, height: image.heightPx } });
}

function sheetTabel(wb: ExcelJS.Workbook, { years, rows, any }: BenefitExcelInput) {
  const ws = wb.addWorksheet("Tabel");
  ws.addRow(["Package", ...years.flatMap((y) => [yearLabel(y), ""])]);
  ws.addRow(["", ...years.flatMap(() => ["Actual", "Kumulative"])]);
  ws.mergeCells(1, 1, 2, 1);
  years.forEach((_, i) => ws.mergeCells(1, 2 + i * 2, 1, 3 + i * 2));
  for (const r of [...rows, any]) ws.addRow([r.label, ...r.cells.flatMap((c) => [c.actual, c.cumulative])]);
  ws.getRow(ws.rowCount).font = { bold: true };
  const last = 1 + years.length * 2;
  boxTable(ws, 1, ws.rowCount, last, 2);
  ws.getColumn(1).width = 52;
  for (let c = 2; c <= last; c++) ws.getColumn(c).width = 13;
}

function sheetGrafis(wb: ExcelJS.Workbook, input: BenefitExcelInput) {
  const { years, rows, any, activeFarmers, images } = input;
  const ws = wb.addWorksheet("Grafis");
  const lastIdx = years.length - 1;
  const t = years[lastIdx].year;
  ws.addRow(["Package", ...years.map((y) => (y.upTo ? `s.d. ${y.year}` : `baru ${y.year}`)), `Kumulative ${t}`, "Belum dilatih", "Petani aktif"]);
  for (const r of [...rows, any]) {
    const cum = r.cells[lastIdx].cumulative;
    ws.addRow([r.label, ...r.cells.map((c) => c.actual), cum, Math.max(0, activeFarmers - cum), activeFarmers]);
  }
  ws.getRow(ws.rowCount).font = { bold: true };
  const last = years.length + 4;
  boxTable(ws, 1, ws.rowCount, last, 1);
  ws.getColumn(1).width = 52;
  for (let c = 2; c <= last; c++) ws.getColumn(c).width = 14;
  ws.addRow([]);
  ws.addRow([`Segmen = tahun pertama dilatih; trek penuh = petani aktif (${activeFarmers}); sisa = belum dilatih.`]).font = { italic: true, color: { argb: "FF64748B" } };
  if (images.grafis) addImageBelow(wb, ws, images.grafis);
}

function sheetKontrak(wb: ExcelJS.Workbook, input: BenefitExcelInput) {
  const { contract, currentYear, filterActive, images } = input;
  const ws = wb.addWorksheet("vs Kontrak");
  if (!contract || (contract.years.length === 0 && contract.baselineYear == null)) {
    ws.addRow(["Belum ada target kontrak (atau gagal dimuat). Isi lewat Master Data › Target Program."]);
    ws.getColumn(1).width = 90;
    return;
  }
  const periods = [
    ...(contract.baselineYear != null ? [{ label: `Start s.d. ${contract.baselineYear}`, future: false }] : []),
    ...contract.years.map((y) => ({ label: String(y), future: y > currentYear })),
  ];
  const groups = [...periods.map((p) => p.label), "Total kontrak"];
  ws.addRow(["Package", ...groups.flatMap((g) => [g, "", ""])]);
  ws.addRow(["", ...groups.flatMap((g) => (g === "Total kontrak" ? ["Target", `Realisasi s.d. ${currentYear}`, "% capaian"] : ["Target", "Realisasi", "%"]))]);
  ws.mergeCells(1, 1, 2, 1);
  groups.forEach((_, i) => ws.mergeCells(1, 2 + i * 3, 1, 4 + i * 3));
  for (const r of contract.rows) {
    const cells = [...(contract.baselineYear != null ? [r.start] : []), ...r.years];
    const values = cells.flatMap((c, i) => {
      if (!c) return [null, null, null];
      // Tahun mendatang: realisasi & % dikosongkan ("belum mulai"), bukan 0.
      if (periods[i].future) return [c.target, null, null];
      return [c.target, c.actual, c.pct == null ? null : c.pct / 100];
    });
    const sum = trajectorySummary(contractTrajectory(r, contract.baselineYear, contract.years, currentYear));
    ws.addRow([r.label, ...values, sum.total || null, sum.realized, sum.total > 0 ? sum.realized / sum.total : null]);
  }
  ws.getRow(ws.rowCount).font = { bold: true };
  const last = 1 + groups.length * 3;
  boxTable(ws, 1, ws.rowCount, last, 2);
  ws.getColumn(1).width = 52;
  for (let c = 2; c <= last; c++) {
    ws.getColumn(c).width = 12;
    if ((c - 1) % 3 === 0) ws.getColumn(c).numFmt = "0%";
  }
  ws.addRow([]);
  const note = (s: string) => (ws.addRow([s]).font = { italic: true, color: { argb: "FF64748B" } });
  note("Target = target kontrak per paket (Master Data › Target Program); realisasi = penerima manfaat baru (tahun pertama dilatih paket itu).");
  note("Baris terakhir = petani yang pernah mengikuti pelatihan apa pun (dihitung sekali) — total program, bukan jumlah paket.");
  if (filterActive) note("Filter Distrik/Lembaga aktif: realisasi hanya untuk wilayah terpilih, sedangkan target berlaku untuk seluruh program.");
  if (images.kontrak) addImageBelow(wb, ws, images.kontrak);
}

export function buildTrainingBenefitWorkbook(input: BenefitExcelInput): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  sheetTabel(wb, input);
  sheetGrafis(wb, input);
  sheetKontrak(wb, input);
  return wb;
}
