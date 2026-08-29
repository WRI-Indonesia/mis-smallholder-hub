import { describe, it, expect } from "vitest";
import { detectHeaderIndex, readSheetRows, type RawSheetRow } from "@/lib/excel-sheet-reader";
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
    expect(result).toEqual({ headers: [], rows: [], headerRowNumber: 0 });
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
