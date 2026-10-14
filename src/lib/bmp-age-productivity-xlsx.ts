import ExcelJS from "exceljs";
import { bmpAgeSeries, bmpYearOptions, sumBmpGroups } from "@/lib/bmp-dashboard-aggregation";
import type { BmpFarmerGroupCategory, BmpGroupEntry } from "@/types/dashboard";

/**
 * Excel Dashboard BMP (#426): produktivitas (Ton/Ha/tahun, disetahunkan) per Lembaga ×
 * kelompok umur tanaman, untuk Rataan + tiap tahun snapshot. Angka memakai fungsi yang
 * sama dengan layar — `sumBmpGroups` (kolom Semua umur = Top 10) dan `bmpAgeSeries`
 * (card Ex-Plasma vs Swadaya) — jadi Excel tak pernah berbeda dari dashboard. Subtotal
 * Distrik/Kategori/Total dihitung ulang dari gabungan Lembaga (Σ produksi disetahunkan ÷
 * Σ luas), bukan rata-rata baris. Keputusan owner 2026-10-12: isi selalu semua Lembaga
 * dalam scope viewer (filter UI diabaikan); sel tanpa luas terdata = kosong.
 */

/** Kolom per periode; urutan = urutan kolom Excel. Label mengikuti format owner. */
export const BMP_AGE_EXCEL_COLUMNS = [
  { key: "all", label: "Semua umur" },
  { key: "lt3", label: "<3 th (TBM)" },
  { key: "3-8", label: "3-8 th (TM Muda)" },
  { key: "9-15", label: "9-15 th (TM Prima)" },
  { key: "16-25", label: "16-25 th (TM Tua)" },
  { key: "gt25", label: ">25 th (Renta)" },
  { key: "unknown", label: "Tanpa thn tanam" },
] as const;

export type BmpAgeExcelColumnKey = (typeof BMP_AGE_EXCEL_COLUMNS)[number]["key"];
export type BmpAgeExcelPeriod = number | "average";

/** null = belum ada luas terdata (sel kosong, bukan 0). */
export interface BmpAgeExcelCell {
  productivityTonHa: number | null;
  reportedAreaHa: number | null;
}

export interface BmpAgeExcelRow {
  kind: "group" | "district" | "category" | "total";
  district: string;
  farmerGroup: string;
  category: string;
  /** Kunci periode: "average" atau tahun sebagai string. */
  cells: Record<string, Record<BmpAgeExcelColumnKey, BmpAgeExcelCell>>;
}

export interface BmpAgeExcelMatrix {
  periods: BmpAgeExcelPeriod[];
  rows: BmpAgeExcelRow[];
}

const CATEGORY_LABEL: Record<BmpFarmerGroupCategory, string> = { EX_PLASMA: "Ex-Plasma", SWADAYA: "Swadaya" };
const EMPTY: BmpAgeExcelCell = { productivityTonHa: null, reportedAreaHa: null };

const periodKey = (p: BmpAgeExcelPeriod) => String(p);
export const periodLabel = (p: BmpAgeExcelPeriod) => (p === "average" ? "Rataan" : String(p));

function cellsFor(groups: BmpGroupEntry[], periods: BmpAgeExcelPeriod[]): BmpAgeExcelRow["cells"] {
  const out: BmpAgeExcelRow["cells"] = {};
  for (const p of periods) {
    const all = sumBmpGroups(groups, p);
    const age = new Map(bmpAgeSeries(groups, p).map((a) => [a.key, a]));
    const row = {} as Record<BmpAgeExcelColumnKey, BmpAgeExcelCell>;
    for (const col of BMP_AGE_EXCEL_COLUMNS) {
      const src =
        col.key === "all"
          ? { produktivitasTonHa: all.produktivitasTonHa, luasMelaporHa: all.totals.luasMelaporHa } // bentuk entri agregasi
          : age.get(col.key);
      row[col.key] = src && src.luasMelaporHa > 0 ? { productivityTonHa: src.produktivitasTonHa, reportedAreaHa: src.luasMelaporHa } : EMPTY;
    }
    out[periodKey(p)] = row;
  }
  return out;
}

/**
 * Matriks Excel: baris Lembaga (urut Distrik → nama), lalu subtotal per Distrik, per
 * Kategori, dan Total. Periode = Rataan lalu tiap tahun snapshot (naik).
 */
export function buildBmpAgeExcelMatrix(groups: BmpGroupEntry[]): BmpAgeExcelMatrix {
  const periods: BmpAgeExcelPeriod[] = ["average", ...[...bmpYearOptions(groups)].sort((a, b) => a - b)];
  const districtOf = (g: BmpGroupEntry) => g.districtName ?? "(Tanpa distrik)";
  const sorted = [...groups].sort((a, b) => districtOf(a).localeCompare(districtOf(b)) || a.name.localeCompare(b.name));

  const rows: BmpAgeExcelRow[] = sorted.map((g) => ({
    kind: "group",
    district: districtOf(g),
    farmerGroup: g.name,
    category: CATEGORY_LABEL[g.category] ?? g.category,
    cells: cellsFor([g], periods),
  }));

  for (const d of [...new Set(sorted.map(districtOf))]) {
    rows.push({ kind: "district", district: d, farmerGroup: "Subtotal Distrik", category: "", cells: cellsFor(sorted.filter((g) => districtOf(g) === d), periods) });
  }
  for (const cat of ["EX_PLASMA", "SWADAYA"] as const) {
    const gs = sorted.filter((g) => g.category === cat);
    if (gs.length) rows.push({ kind: "category", district: "", farmerGroup: "Subtotal Kategori", category: CATEGORY_LABEL[cat], cells: cellsFor(gs, periods) });
  }
  if (sorted.length) rows.push({ kind: "total", district: "", farmerGroup: "Total", category: "", cells: cellsFor(sorted, periods) });

  return { periods, rows };
}

const THIN = { style: "thin" as const };
const BORDER = { top: THIN, left: THIN, bottom: THIN, right: THIN };
const HEADER_FILL = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFF2F2F2" } };
const SUBTOTAL_FILL = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFEAF4EC" } };
const ID_COLS = 3;
const HEADER_ROWS = 3;

/**
 * Satu sheet: header 3 baris (merge) — A–C Distrik/Lembaga/Kategori, baris 1 judul nilai,
 * baris 2 periode, baris 3 kolom umur; data mulai baris 4, subtotal setelah satu baris kosong.
 */
function fillSheet(ws: ExcelJS.Worksheet, matrix: BmpAgeExcelMatrix, title: string, pick: (c: BmpAgeExcelCell) => number | null) {
  const perPeriod = BMP_AGE_EXCEL_COLUMNS.length;
  const lastCol = ID_COLS + matrix.periods.length * perPeriod;

  ["Distrik", "Lembaga", "Kategori Lembaga"].forEach((h, i) => {
    ws.getCell(1, i + 1).value = h;
    ws.mergeCells(1, i + 1, HEADER_ROWS, i + 1);
  });
  ws.getCell(1, ID_COLS + 1).value = title;
  ws.mergeCells(1, ID_COLS + 1, 1, lastCol);
  matrix.periods.forEach((p, pi) => {
    const start = ID_COLS + 1 + pi * perPeriod;
    ws.getCell(2, start).value = periodLabel(p);
    ws.mergeCells(2, start, 2, start + perPeriod - 1);
    BMP_AGE_EXCEL_COLUMNS.forEach((col, ci) => (ws.getCell(3, start + ci).value = col.label));
  });
  for (let r = 1; r <= HEADER_ROWS; r++) {
    const row = ws.getRow(r);
    row.font = { bold: true };
    row.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    for (let c = 1; c <= lastCol; c++) {
      row.getCell(c).border = BORDER;
      row.getCell(c).fill = HEADER_FILL;
    }
  }
  ws.getRow(3).height = 30;
  // Judul membentang puluhan kolom — rata kiri supaya terbaca tanpa menggulir ke tengah.
  ws.getCell(1, ID_COLS + 1).alignment = { horizontal: "left", vertical: "middle", indent: 1 };

  let r = HEADER_ROWS + 1;
  const writeRow = (row: BmpAgeExcelRow) => {
    const xr = ws.getRow(r++);
    xr.getCell(1).value = row.district;
    xr.getCell(2).value = row.farmerGroup;
    xr.getCell(3).value = row.category;
    matrix.periods.forEach((p, pi) => {
      const cells = row.cells[periodKey(p)];
      BMP_AGE_EXCEL_COLUMNS.forEach((col, ci) => {
        const v = pick(cells[col.key]);
        const cell = xr.getCell(ID_COLS + 1 + pi * perPeriod + ci);
        if (v != null) cell.value = v;
        cell.numFmt = "0.00";
      });
    });
    for (let c = 1; c <= lastCol; c++) xr.getCell(c).border = BORDER;
    if (row.kind !== "group") {
      xr.font = { bold: true };
      for (let c = 1; c <= lastCol; c++) xr.getCell(c).fill = SUBTOTAL_FILL;
    }
  };

  const groupRows = matrix.rows.filter((x) => x.kind === "group");
  groupRows.forEach(writeRow);
  const lastDataRow = r - 1;
  r += 1; // satu baris kosong: subtotal di luar jangkauan AutoFilter/pivot
  matrix.rows.filter((x) => x.kind !== "group").forEach(writeRow);

  ws.getColumn(1).width = 14;
  ws.getColumn(2).width = 34;
  ws.getColumn(3).width = 12;
  for (let c = ID_COLS + 1; c <= lastCol; c++) ws.getColumn(c).width = 11;
  ws.views = [{ state: "frozen", xSplit: ID_COLS, ySplit: HEADER_ROWS }];
  if (groupRows.length) ws.autoFilter = { from: { row: HEADER_ROWS, column: 1 }, to: { row: lastDataRow, column: lastCol } };
}

export interface BmpAgeExcelMeta {
  /** Tanggal snapshot (teks siap tampil). */
  snapshotLabel: string;
  createdByName: string;
}

export function buildBmpAgeProductivityWorkbook(groups: BmpGroupEntry[], meta: BmpAgeExcelMeta): ExcelJS.Workbook {
  const matrix = buildBmpAgeExcelMatrix(groups);
  const wb = new ExcelJS.Workbook();
  fillSheet(wb.addWorksheet("Produktivitas"), matrix, "Produktivitas (YOY) — Ton/Ha/tahun", (c) => c.productivityTonHa);
  fillSheet(wb.addWorksheet("Luas terdata"), matrix, "Luas terdata (Ha)", (c) => c.reportedAreaHa);

  const info = wb.addWorksheet("Keterangan");
  info.columns = [{ width: 22 }, { width: 100 }];
  info.addRows([
    ["Sumber", `Snapshot Dashboard BMP ${meta.snapshotLabel} (dibuat oleh ${meta.createdByName})`],
    ["Cakupan", "Semua Lembaga Petani sesuai hak akses wilayah Anda; filter di dashboard tidak memengaruhi isi berkas ini."],
    ["Produktivitas", "Ton/Ha/tahun, disetahunkan per Lembaga: tahun yang datanya belum 12 bulan diproyeksikan (produksi × 12 ÷ jumlah bulan ber-data), dibagi luas lahan yang terdata pada tahun itu."],
    ["Rataan", "Σ produksi disetahunkan ÷ Σ luas terdata lintas semua tahun — sama dengan mode Rataan di dashboard, bukan rata-rata kolom tahun. Luas Rataan = rata-rata luas per tahun ber-data."],
    ["Umur tanaman", "Dihitung pada tahun produksinya (tahun produksi − tahun tanam). Lahan tanpa tahun tanam masuk kolom 'Tanpa thn tanam'."],
    ["Semua umur", "Produktivitas Lembaga keseluruhan (sama dengan grafik Top 10). Produksi tanpa ID Lahan ikut produksi tetapi tidak menambah luas."],
    ["Subtotal", "Subtotal Distrik/Kategori dan Total dihitung dari gabungan Lembaga (Σ produksi disetahunkan ÷ Σ luas), bukan rata-rata baris."],
    ["Sel kosong", "Belum ada luas terdata pada kombinasi itu — bukan nol."],
  ]);
  info.getColumn(1).font = { bold: true };
  info.getColumn(2).alignment = { wrapText: true, vertical: "top" };
  return wb;
}
