import { describe, it, expect } from "vitest";
import { cellValueToPrimitive } from "@/lib/excel-cell";
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
