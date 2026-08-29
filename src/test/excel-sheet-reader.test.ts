import { describe, it, expect } from "vitest";
import Excel from "exceljs";
import {
  detectHeaderIndex,
  readSheetRows,
  readSpreadsheetFile,
  type RawSheetRow,
} from "@/lib/excel-sheet-reader";
import { formatFieldErrors, collectFieldErrorMessages } from "@/lib/validation-message";

/**
 * #301 — header tidak lagi diasumsikan ada di baris fisik 1. Berkas dengan
 * baris judul di atas header dulu menghasilkan header kosong tanpa satu pun
 * pesan salah; test ini mengunci perilaku barunya.
 */

/** Bantu tulis matriks jadi `RawSheetRow[]` dengan nomor baris fisik berurutan. */
function sheet(rows: (string | number | null)[][]): RawSheetRow[] {
  return rows.map((values, i) => ({ rowNumber: i + 1, values }));
}

const ALIASES = ["id lahan", "id petani"];
const isHeaderCandidate = (labels: string[]) =>
  labels.some((l) => ALIASES.includes(l.toLowerCase().trim()));

describe("detectHeaderIndex", () => {
  it("mengambil baris 1 pada berkas normal", () => {
    const rows = sheet([
      ["ID Lahan", "ID Petani"],
      ["A.1", "P.1"],
    ]);
    expect(detectHeaderIndex(rows)).toBe(0);
    expect(detectHeaderIndex(rows, { isHeaderCandidate })).toBe(0);
  });

  it("melewati baris judul satu sel", () => {
    const rows = sheet([
      ["DATA LAHAN KAMPAR 2025", null],
      ["ID Lahan", "ID Petani"],
      ["A.1", "P.1"],
    ]);
    expect(detectHeaderIndex(rows)).toBe(1);
  });

  it("alias menang atas aturan ≥2 sel terisi", () => {
    // Baris judul dua sel ("Laporan" + "2025") lolos aturan cacah sel, tapi
    // baris alias di bawahnya-lah header yang sebenarnya.
    const rows = sheet([
      ["Laporan Detail Lahan", "2025"],
      ["ID Lahan", "ID Petani"],
      ["A.1", "P.1"],
    ]);
    expect(detectHeaderIndex(rows)).toBe(0);
    expect(detectHeaderIndex(rows, { isHeaderCandidate })).toBe(1);
  });

  it("jaring pengaman: berkas satu kolom memakai baris terisi pertama", () => {
    const rows = sheet([[null], ["ID Petani"], ["P.1"]]);
    expect(detectHeaderIndex(rows)).toBe(1);
  });

  it("-1 bila tidak ada baris terisi", () => {
    expect(detectHeaderIndex(sheet([[null, null], ["", "  "]]))).toBe(-1);
  });

  it("tidak memindai melewati scanLimit", () => {
    const rows = sheet([...Array.from({ length: 5 }, () => ["Judul", null]), ["ID Lahan", "ID Petani"]]);
    // scanLimit 3: alias di indeks 5 tak terlihat, jatuh ke aturan cacah sel —
    // dan tak satu pun baris teratas punya ≥2 sel, jadi jaring pengaman menang.
    expect(detectHeaderIndex(rows, { isHeaderCandidate, scanLimit: 3 })).toBe(0);
  });
});

describe("readSheetRows", () => {
  it("mengembalikan header, baris, dan nomor baris fisik header", () => {
    const result = readSheetRows(
      sheet([
        ["Rekap Detail Lahan", null, null],
        [null, null, null],
        ["ID Lahan", "ID Petani", "Nomor STDB"],
        ["A.1", "P.1", "3475"],
        ["A.2", "P.2", null],
      ]),
      { isHeaderCandidate },
    );

    expect(result.headerRowNumber).toBe(3);
    expect(result.headers).toEqual(["ID Lahan", "ID Petani", "Nomor STDB"]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({ "ID Lahan": "A.1", "ID Petani": "P.1", "Nomor STDB": "3475" });
  });

  it("membuang header kosong dan tidak membuat kunci kosong", () => {
    const result = readSheetRows(
      sheet([
        ["ID Lahan", "", "ID Petani"],
        ["A.1", "abaikan", "P.1"],
      ]),
    );
    expect(result.headers).toEqual(["ID Lahan", "ID Petani"]);
    expect(Object.keys(result.rows[0])).toEqual(["ID Lahan", "ID Petani"]);
  });

  it("melewati baris kosong di antara data", () => {
    const result = readSheetRows(
      sheet([
        ["ID Lahan", "ID Petani"],
        ["A.1", "P.1"],
        [null, null],
        ["A.2", "P.2"],
      ]),
    );
    expect(result.rows).toHaveLength(2);
  });

  it("header trim, nilai sel apa adanya", () => {
    const result = readSheetRows(
      sheet([
        ["  ID Lahan  ", "Luas"],
        ["A.1", 1.25],
      ]),
    );
    expect(result.headers).toEqual(["ID Lahan", "Luas"]);
    expect(result.rows[0]["Luas"]).toBe(1.25);
  });

  it("berkas kosong tidak melempar dan tidak berpura-pura punya header", () => {
    const result = readSheetRows(sheet([[null], [""]]));
    expect(result).toEqual({ headers: [], rows: [], rowNumbers: [], headerRowNumber: 0 });
  });

  it("rowNumbers = baris FISIK, bukan indeks — baris kosong di tengah tak menggeser nomor", () => {
    // Inti #301: "Baris Asal" harus menunjuk baris yang benar di Excel. Baris
    // kosong dibuang, jadi `indeks + header + 1` akan meleset sebanyak baris
    // kosong di atasnya — persis yang membuat operator mencari baris yang salah.
    const result = readSheetRows(
      sheet([
        ["ID Lahan", "ID Petani"],
        ["A.1", "P.1"],
        [null, null],
        [null, null],
        ["A.2", "P.2"],
      ]),
    );
    expect(result.rows).toHaveLength(2);
    expect(result.rowNumbers).toEqual([2, 5]);
  });

  it("rowNumbers ikut bergeser saat header bukan di baris 1", () => {
    const result = readSheetRows(
      sheet([
        ["REKAP 2025", null],
        [null, null],
        ["ID Lahan", "ID Petani"],
        ["A.1", "P.1"],
      ]),
    );
    expect(result.headerRowNumber).toBe(3);
    expect(result.rowNumbers).toEqual([4]);
  });
});

describe("formatFieldErrors", () => {
  it("mengambil pesan Zod tanpa nama field dan tanpa JSON", () => {
    const msg = formatFieldErrors(
      { name: ["Nama wajib diisi"], nik: ["NIK harus 16 digit"] },
      "Ada baris yang tidak lolos validasi",
    );
    expect(msg).toBe("Ada baris yang tidak lolos validasi: Nama wajib diisi; NIK harus 16 digit");
    expect(msg).not.toContain("{");
    expect(msg).not.toContain("nik");
  });

  it("membuang pesan duplikat lintas field", () => {
    expect(
      collectFieldErrorMessages({ a: ["Wajib diisi"], b: ["Wajib diisi"], c: ["Lainnya"] }),
    ).toEqual(["Wajib diisi", "Lainnya"]);
  });

  it("meringkas bila kesalahannya banyak", () => {
    const msg = formatFieldErrors({ a: ["A"], b: ["B"], c: ["C"], d: ["D"], e: ["E"] }, "Gagal");
    expect(msg).toBe("Gagal: A; B; C (dan 2 kesalahan lain)");
  });

  it("tetap berkalimat Indonesia bila fieldErrors kosong", () => {
    expect(formatFieldErrors({}, "Data tidak lolos validasi")).toBe(
      "Data tidak lolos validasi. Periksa kembali isi berkas Anda.",
    );
  });
});

/**
 * Pemilihan sheet (#301). `rowCount` exceljs berbohong pada sheet kosong yang
 * pernah diformat: `MIS_KAMPAR_data-lahan.xlsx` punya "Sheet1" ber-rowCount
 * 1000 yang seluruhnya kosong di samping sheet "Data" berisi 4.124 baris.
 * Karena itu sheet dinilai dari apakah ia menghasilkan header, bukan dari
 * rowCount-nya.
 */
describe("readSpreadsheetFile — pemilihan sheet .xlsx", () => {
  async function xlsx(sheets: { name: string; rows: (string | number | null)[][] }[]): Promise<File> {
    const wb = new Excel.Workbook();
    for (const s of sheets) {
      const ws = wb.addWorksheet(s.name);
      for (const r of s.rows) ws.addRow(r);
    }
    const buf = await wb.xlsx.writeBuffer();
    return new File([new Uint8Array(buf as ArrayBuffer)], "uji.xlsx");
  }

  const HEADER = ["ID Lahan", "ID Petani"];
  const DATA = [HEADER, ["A.1", "P.1"]];

  it("mengutamakan sheet bernama 'Data'", async () => {
    const f = await xlsx([
      { name: "Lain", rows: [["Kolom X", "Kolom Y"], ["1", "2"]] },
      { name: "Data", rows: DATA },
    ]);
    const r = await readSpreadsheetFile(f);
    expect(r.headers).toEqual(HEADER);
    expect(r.rows).toHaveLength(1);
  });

  it("melewati sheet kosong dan memakai sheet berikutnya yang berisi", async () => {
    const f = await xlsx([
      { name: "Sheet1", rows: [[null, null], [null, null]] },
      { name: "Isi", rows: DATA },
    ]);
    const r = await readSpreadsheetFile(f);
    expect(r.headers).toEqual(HEADER);
    expect(r.rows).toHaveLength(1);
  });

  it("sheet TERSEMBUNYI dilewati — template Excel kerap menaruh daftar dropdown di sana", async () => {
    const wb = new Excel.Workbook();
    const hidden = wb.addWorksheet("Data");
    hidden.state = "hidden";
    for (const r of [["Pilihan A", "Pilihan B"], ["x", "y"]]) hidden.addRow(r);
    const visibleWs = wb.addWorksheet("Sheet1");
    for (const r of DATA) visibleWs.addRow(r);
    const buf = await wb.xlsx.writeBuffer();
    const r = await readSpreadsheetFile(new File([new Uint8Array(buf as ArrayBuffer)], "uji.xlsx"));
    // Tanpa saringan hidden, sheet "Data" menang dan importer membaca dropdown.
    expect(r.headers).toEqual(HEADER);
  });

  it("berkas tanpa isi sama sekali → header kosong, bukan lempar", async () => {
    const f = await xlsx([{ name: "Sheet1", rows: [[null]] }]);
    const r = await readSpreadsheetFile(f);
    expect(r.headers).toEqual([]);
    expect(r.headerRowNumber).toBe(0);
  });

  it("ekstensi selain .xlsx/.csv ditolak berpesan Indonesia", async () => {
    await expect(readSpreadsheetFile(new File([""], "data.pdf"))).rejects.toThrow(
      "Hanya mendukung berkas Excel (.xlsx) atau CSV",
    );
  });
});
