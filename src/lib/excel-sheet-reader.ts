import Excel from "exceljs";
import Papa from "papaparse";
import { cellValueToPrimitive, type PrimitiveCellValue } from "@/lib/excel-cell";

/**
 * Pembaca berkas tabel (XLSX/CSV) bersama untuk seluruh klien import (#301).
 *
 * Sebelumnya blok baca ini tersalin di **empat** klien (petani, produksi,
 * detail lahan, tambah peserta pelatihan) dan keempatnya memakai asumsi yang
 * sama: **header selalu di baris fisik 1**. Berkas dengan baris judul atau
 * baris kosong di atas header karena itu menghasilkan header kosong — "N baris
 * terdeteksi" muncul tanpa kartu pemetaan dan tanpa satu pun pesan salah,
 * kegagalan diam yang paling mahal dari semua kegagalan import.
 *
 * Aturan pencarian header di sini, berurutan:
 * 1. baris pertama yang label-labelnya dikenali `isHeaderCandidate`
 *    (auto-match alias) — bukti "ini nama kolom" lebih kuat daripada cacah sel,
 *    jadi ia menang atas aturan 2 walau letaknya lebih bawah;
 * 2. baris pertama dengan **≥2 sel terisi** — baris judul lazimnya satu sel
 *    (sel-sel lain kosong, termasuk saat judul di-merge: exceljs hanya mengisi
 *    sel kiri-atas);
 * 3. baris terisi pertama, sebagai jaring pengaman untuk berkas satu kolom.
 *
 * `headerRowNumber` yang dikembalikan adalah nomor baris **fisik** di berkas
 * supaya klien bisa memberi tahu pengguna ("Header ditemukan di baris 3") —
 * tanpa itu, koreksi otomatis ini justru jadi sihir yang tak bisa diperiksa.
 */

/** Satu baris mentah + nomor baris FISIK di berkas (1-based). */
export interface RawSheetRow {
  rowNumber: number;
  values: PrimitiveCellValue[];
}

/** Baris hasil baca — kunci = label header, nilai apa adanya (bisa `undefined` untuk sel kosong). */
export type SheetRecord = Record<string, unknown>;

export interface ReadSheetOptions {
  /**
   * Penanda header berbasis alias, dipanggil dengan label yang sudah di-trim.
   * Biasanya `Object.keys(autoMatch(labels)).length > 0`.
   */
  isHeaderCandidate?: (labels: string[]) => boolean;
  /** Batas baris teratas yang dipindai saat mencari header (default 20). */
  scanLimit?: number;
}

export interface SheetReadResult {
  /** Label kolom, sudah di-trim; sel header kosong dibuang. */
  headers: string[];
  rows: SheetRecord[];
  /** Nomor baris fisik header; 0 bila berkas tidak berisi apa pun. */
  headerRowNumber: number;
}

const DEFAULT_SCAN_LIMIT = 20;

/** Label baris (trim). Lubang array sengaja dibiarkan lubang — lihat `readSheetRows`. */
function labelsOf(values: PrimitiveCellValue[]): string[] {
  return values.map((v) => (v == null ? "" : String(v).trim()));
}

function filledCount(labels: string[]): number {
  return labels.filter(Boolean).length;
}

/** Indeks baris header di dalam `rows`; -1 bila tak ada baris terisi sama sekali. */
export function detectHeaderIndex(rows: RawSheetRow[], options: ReadSheetOptions = {}): number {
  const { isHeaderCandidate, scanLimit = DEFAULT_SCAN_LIMIT } = options;
  const scan = rows.slice(0, scanLimit);

  if (isHeaderCandidate) {
    const byAlias = scan.findIndex((r) => isHeaderCandidate(labelsOf(r.values).filter(Boolean)));
    if (byAlias >= 0) return byAlias;
  }
  const byCount = scan.findIndex((r) => filledCount(labelsOf(r.values)) >= 2);
  if (byCount >= 0) return byCount;

  return rows.findIndex((r) => filledCount(labelsOf(r.values)) >= 1);
}

/**
 * Ubah baris mentah menjadi header + record. Murni (tanpa exceljs/DOM) supaya
 * bisa diuji langsung dengan matriks biasa.
 */
export function readSheetRows(rows: RawSheetRow[], options: ReadSheetOptions = {}): SheetReadResult {
  const headerIndex = detectHeaderIndex(rows, options);
  if (headerIndex < 0) return { headers: [], rows: [], headerRowNumber: 0 };

  const headerRow = rows[headerIndex];
  const labels = labelsOf(headerRow.values);
  const headers = labels.filter(Boolean);

  const records: SheetRecord[] = [];
  for (const row of rows.slice(headerIndex + 1)) {
    if (filledCount(labelsOf(row.values)) === 0) continue;
    const record: SheetRecord = {};
    // `forEach` melewati lubang array — persis perilaku lama, dan nilai sel
    // tidak dinormalisasi (`undefined` tetap `undefined`) supaya preprocess
    // Zod di hilir menerima bentuk yang sama seperti sebelum dedup ini.
    labels.forEach((label, i) => {
      if (label) record[label] = row.values[i];
    });
    records.push(record);
  }

  return { headers, rows: records, headerRowNumber: headerRow.rowNumber };
}

function readCsvFile(file: File, options: ReadSheetOptions): Promise<SheetReadResult> {
  return new Promise((resolve, reject) => {
    // `header: false` + `skipEmptyLines: false`: header dicari sendiri, dan
    // baris kosong tetap dihitung agar nomor baris fisik tidak bergeser.
    Papa.parse<string[]>(file, {
      header: false,
      skipEmptyLines: false,
      complete: (results) => {
        const rows = results.data.map((values, i) => ({ rowNumber: i + 1, values }));
        resolve(readSheetRows(rows, options));
      },
      error: () => reject(new Error("Gagal membaca file CSV")),
    });
  });
}

async function readXlsxFile(file: File, options: ReadSheetOptions): Promise<SheetReadResult> {
  const workbook = new Excel.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  // Berkas sumber kadang punya sheet pertama kosong ("Sheet1") dan data di
  // sheet "Data" — pilih sheet pertama yang benar-benar berisi baris data.
  const worksheet =
    workbook.worksheets.find((ws) => ws.name.trim().toLowerCase() === "data" && ws.rowCount > 1) ??
    workbook.worksheets.find((ws) => ws.rowCount > 1) ??
    workbook.worksheets[0];
  if (!worksheet) throw new Error("Tidak ada sheet berisi data");

  const rows: RawSheetRow[] = [];
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    // Normalisasi ke primitif: sel error/rich text/formula dari exceljs berupa
    // objek yang membuat tabel pratinjau crash bila dirender (#196).
    const values = (Array.isArray(row.values) ? row.values.slice(1) : Object.values(row.values)).map(
      cellValueToPrimitive,
    );
    rows.push({ rowNumber, values });
  });

  return readSheetRows(rows, options);
}

/**
 * Baca berkas `.xlsx` atau `.csv` yang dipilih pengguna. Melempar `Error`
 * berpesan Bahasa Indonesia yang sudah layak ditampilkan langsung ke toast.
 */
export async function readSpreadsheetFile(
  file: File,
  options: ReadSheetOptions = {},
): Promise<SheetReadResult> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "csv") return readCsvFile(file, options);
  if (ext === "xlsx") return readXlsxFile(file, options);
  throw new Error("Hanya mendukung berkas Excel (.xlsx) atau CSV");
}
