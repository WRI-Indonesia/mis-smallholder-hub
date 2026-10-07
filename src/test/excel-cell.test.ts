import { describe, it, expect } from "vitest";
import { cellValueToPrimitive, parseExcelDate } from "@/lib/excel-cell";
import type { CellValue } from "exceljs";

/**
 * Unit test normalisasi CellValue exceljs (#196). Sel error Excel (#N/A dst.)
 * dikembalikan exceljs sebagai objek `{ error }` — tanpa normalisasi, objek itu
 * dirender sebagai React child di tabel preview bulk upload dan meng-crash
 * seluruh halaman.
 */
describe("cellValueToPrimitive", () => {
  it("meneruskan nilai primitif apa adanya", () => {
    expect(cellValueToPrimitive("Budi ")).toBe("Budi ");
    expect(cellValueToPrimitive(42)).toBe(42);
    expect(cellValueToPrimitive(true)).toBe(true);
    const d = new Date("2000-01-15");
    expect(cellValueToPrimitive(d)).toBe(d);
  });

  it("mengubah null/undefined menjadi null", () => {
    expect(cellValueToPrimitive(null)).toBeNull();
    expect(cellValueToPrimitive(undefined)).toBeNull();
  });

  it("memperlakukan sel error Excel (#N/A, #REF!) sebagai kosong", () => {
    expect(cellValueToPrimitive({ error: "#N/A" })).toBeNull();
    expect(cellValueToPrimitive({ error: "#REF!" })).toBeNull();
  });

  it("menggabungkan rich text menjadi satu string", () => {
    expect(
      cellValueToPrimitive({ richText: [{ text: "Kampung " }, { text: "Baru" }] }),
    ).toBe("Kampung Baru");
  });

  it("mengambil teks dari sel hyperlink", () => {
    expect(
      cellValueToPrimitive({ text: "Peta KUD", hyperlink: "https://example.com" }),
    ).toBe("Peta KUD");
  });

  it("hyperlink ber-teks rich text (rekap Monev BMP #344) → teks gabungan, bukan [object Object]", () => {
    expect(
      cellValueToPrimitive({
        text: { richText: [{ text: "ASPEK RSB." }, { text: "0063.A.14.06.07.2013" }] },
        hyperlink: "https://example.com/lahan",
      } as unknown as Parameters<typeof cellValueToPrimitive>[0]),
    ).toBe("ASPEK RSB.0063.A.14.06.07.2013");
  });

  it("mengambil result dari sel formula, termasuk result berupa error", () => {
    expect(cellValueToPrimitive({ formula: "A1&B1", result: "PTN-001" })).toBe("PTN-001");
    expect(cellValueToPrimitive({ formula: "SUM(A:A)", result: 7 })).toBe(7);
    expect(
      cellValueToPrimitive({
        formula: 'VLOOKUP(A1,X:Y,2,0)',
        result: { error: "#N/A" },
      } as CellValue),
    ).toBeNull();
    expect(
      cellValueToPrimitive({ sharedFormula: "A1", formula: "A1&B1", result: "X" } as CellValue),
    ).toBe("X");
  });
});

describe("parseExcelDate — tanggal sel upload (#400, akar #354)", () => {
  // vitest.config mematok TZ=UTC; nilai diperiksa lewat ISO/getter UTC agar maksudnya eksplisit.
  const ymd = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
  const iso = (d: Date | null) => (d ? d.toISOString() : null);

  it("teks DD/MM/YYYY dengan hari ≤ 12 dibaca hari/bulan, bukan format AS Date.parse", () => {
    // Logika lama: Date.parse("12/03/1971") → 3 Desember 1971.
    expect(ymd(parseExcelDate("12/03/1971"))).toBe("1971-03-12");
    expect(ymd(parseExcelDate("05-08-1966"))).toBe("1966-08-05");
    expect(ymd(parseExcelDate("1.2.1980"))).toBe("1980-02-01");
    expect(ymd(parseExcelDate(" 25/03/1971 "))).toBe("1971-03-25");
  });

  it("teks berekor jam (ekspor CSV/DB) tetap DD/MM — tak jatuh ke Date.parse", () => {
    expect(ymd(parseExcelDate("12/03/1971 00:00"))).toBe("1971-03-12");
    expect(ymd(parseExcelDate("05/08/1966 0:00:00"))).toBe("1966-08-05");
    expect(ymd(parseExcelDate("1971-03-12T00:00:00"))).toBe("1971-03-12");
    expect(ymd(parseExcelDate("12/3/1971 12:00:00 PM"))).toBe("1971-03-12");
    expect(ymd(parseExcelDate("12/03/1971 10:00 AM"))).toBe("1971-03-12");
  });

  it("timestamp ber-zona dibaca hari WIB-nya (ekspor UTC dari tengah malam WIB tak mundur sehari)", () => {
    expect(ymd(parseExcelDate("1971-03-12T00:00:00Z"))).toBe("1971-03-12");
    expect(ymd(parseExcelDate("1971-03-12T00:00:00.000Z"))).toBe("1971-03-12");
    expect(ymd(parseExcelDate("1971-03-12T00:00:00+07:00"))).toBe("1971-03-12");
    expect(ymd(parseExcelDate("1971-03-11T17:00:00.000Z"))).toBe("1971-03-12"); // toISOString tengah malam WIB
    expect(ymd(parseExcelDate("1971-03-12 00:00:00 +0700"))).toBe("1971-03-12");
    expect(ymd(parseExcelDate("12/03/1971 00:00 UTC"))).toBe("1971-03-12");
  });

  it("variasi spasi & penanda jam yang lazim di ekspor", () => {
    expect(ymd(parseExcelDate("12/03/1971  00:00"))).toBe("1971-03-12");
    expect(ymd(parseExcelDate("12/03/1971\u00A000:00"))).toBe("1971-03-12");
    expect(ymd(parseExcelDate("12/03/1971 10:00 a.m."))).toBe("1971-03-12");
  });

  it("hasil tidak bergantung TZ proses (getter UTC saja)", () => {
    const prev = process.env.TZ;
    try {
      for (const tz of ["America/Los_Angeles", "Asia/Jakarta", "Pacific/Kiritimati"]) {
        process.env.TZ = tz;
        expect(iso(parseExcelDate("12/03/1971"))).toBe("1971-03-12T00:00:00.000Z");
        expect(iso(parseExcelDate(26004))).toBe("1971-03-12T00:00:00.000Z");
        expect(iso(parseExcelDate("1971-03-11T17:00:00Z"))).toBe("1971-03-12T00:00:00.000Z");
      }
    } finally {
      process.env.TZ = prev;
    }
  });

  it("semua jalur → tengah malam UTC (sama dengan form manual & parseDateCell)", () => {
    expect(iso(parseExcelDate("12/03/1971"))).toBe("1971-03-12T00:00:00.000Z");
    expect(iso(parseExcelDate("1971-03-12"))).toBe("1971-03-12T00:00:00.000Z");
    expect(iso(parseExcelDate(26004))).toBe("1971-03-12T00:00:00.000Z"); // serial Excel
    expect(iso(parseExcelDate(26004.75))).toBe("1971-03-12T00:00:00.000Z"); // pecahan jam dibuang
    expect(iso(parseExcelDate(new Date(Date.UTC(1971, 2, 12))))).toBe("1971-03-12T00:00:00.000Z"); // sel tanggal exceljs
  });

  it("teks non-pola tidak ditebak (dulu Date.parse: \"Panen 1\" → 2001-01-01)", () => {
    for (const s of ["x 5", "Panen 1", "Juni 2026", "12 Mar 71", "12 March 1971", "Thu Mar 12 1971 00:00:00 GMT+0700"]) {
      expect(parseExcelDate(s)).toBeNull();
    }
  });

  it("angka kecil / tahun saja bukan serial tanggal", () => {
    expect(parseExcelDate(1971)).toBeNull(); // dulu → 1905-05-24
    expect(parseExcelDate(5)).toBeNull();
    expect(parseExcelDate(3653)).toBeNull(); // 1909-12-31
    expect(ymd(parseExcelDate(3654))).toBe("1910-01-01");
  });

  it("tanggal 1 sebuah bulan tetap di bulan itu (validasi periode Produksi)", () => {
    const d = parseExcelDate("01/06/2026")!;
    expect([d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()]).toEqual([2026, 6, 1]);
  });

  it("tanggal tak valid, tahun 2 digit, dan tahun di luar 1900–2100 ditolak — tidak digeser/ditebak", () => {
    expect(parseExcelDate("31/02/1971")).toBeNull();
    expect(parseExcelDate("12/13/1971")).toBeNull();
    expect(parseExcelDate("12/03/71")).toBeNull();
    expect(parseExcelDate("12/03/71 10:00")).toBeNull();
    expect(parseExcelDate("12/03/2971")).toBeNull();
    expect(parseExcelDate("12/03/1871")).toBeNull();
    expect(parseExcelDate("")).toBeNull();
    expect(parseExcelDate(null)).toBeNull();
    expect(parseExcelDate("bukan tanggal")).toBeNull();
    expect(parseExcelDate(new Date(Number.NaN))).toBeNull();
  });
});
