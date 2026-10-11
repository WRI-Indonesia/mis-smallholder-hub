import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import ExcelJS from "exceljs";
import { exportToExcel, exportMultiSheetToExcel } from "@/lib/xlsx";

/**
 * Builder unduhan Excel `src/lib/xlsx.ts` ASLI. Env vitest = node, jadi
 * `window`/`document` di-stub: blob yang "diunduh" ditangkap lalu dibaca ulang
 * dengan ExcelJS untuk memeriksa struktur workbook (sheet, header, isi, gaya).
 */
let captured: Blob | null;
let anchor: { href: string; download: string; click: ReturnType<typeof vi.fn> };

beforeEach(() => {
  captured = null;
  anchor = { href: "", download: "", click: vi.fn() };
  vi.stubGlobal("window", {
    URL: {
      createObjectURL: (b: Blob) => {
        captured = b;
        return "blob:uji";
      },
      revokeObjectURL: vi.fn(),
    },
  });
  vi.stubGlobal("document", { createElement: () => anchor });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function readBack(): Promise<ExcelJS.Workbook> {
  expect(captured).not.toBeNull();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await captured!.arrayBuffer());
  return wb;
}

describe("exportToExcel", () => {
  it("satu sheet: header tebal ber-fill abu, baris data sesuai key, nama berkas .xlsx", async () => {
    await exportToExcel({
      filename: "petani",
      sheetName: "Petani",
      columns: [
        { header: "Nama", key: "name", width: 20 },
        { header: "Luas (Ha)", key: "area" },
      ],
      data: [
        { name: "Abdul", area: 2.5 },
        { name: "Siti", area: 1 },
      ],
    });
    expect(anchor.download).toBe("petani.xlsx");
    expect(anchor.click).toHaveBeenCalledTimes(1);
    expect(captured!.type).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    const ws = (await readBack()).getWorksheet("Petani")!;
    expect(ws.getRow(1).values).toEqual([undefined, "Nama", "Luas (Ha)"]);
    expect(ws.getRow(1).font?.bold).toBe(true);
    expect(ws.getCell("A1").fill).toMatchObject({ type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F2F2" } });
    expect(ws.getRow(2).values).toEqual([undefined, "Abdul", 2.5]);
    expect(ws.rowCount).toBe(3);
  });

  it("lebar kolom eksplisit dipertahankan di berkas", async () => {
    await exportToExcel({ filename: "x", columns: [{ header: "A", key: "a", width: 7 }], data: [{ a: "x" }] });
    const ws = (await readBack()).getWorksheet("Data")!; // sheetName bawaan
    expect(ws.getColumn(1).width).toBe(7);
  });

  it("auto-fit lebar kolom tanpa width: isi terpanjang + 3, dijepit 10-50 (TD-049)", async () => {
    // Dulu cabang auto-fit tak pernah aktif: ExcelJS mengisi lebar bawaan 9
    // untuk kolom tanpa width sehingga `if (!column.width)` selalu salah.
    // Kini deteksinya dari definisi kolom kita (`col.width == null`).
    await exportToExcel({
      filename: "x",
      columns: [
        { header: "C", key: "c" },
        { header: "Pendek", key: "p" },
        { header: "L", key: "l" },
      ],
      data: [{ c: "1234567890123456789", p: "x", l: "a".repeat(120) }],
    });
    const ws = (await readBack()).getWorksheet("Data")!;
    expect(ws.getColumn(1).width).toBe(22);
    expect(ws.getColumn(2).width).toBe(10);
    expect(ws.getColumn(3).width).toBe(50);
  });

  it("kolom wrap → wrapText + rata atas (#331); kolom lain tanpa alignment", async () => {
    await exportToExcel({
      filename: "x",
      columns: [
        { header: "Kode", key: "k" },
        { header: "Lahan", key: "l", wrap: true },
      ],
      data: [{ k: "A", l: "HJP.1\nHJP.2" }],
    });
    const ws = (await readBack()).getWorksheet("Data")!;
    expect(ws.getCell("B2").alignment).toMatchObject({ wrapText: true, vertical: "top" });
    expect(ws.getCell("B2").value).toBe("HJP.1\nHJP.2");
    expect(ws.getCell("A2").alignment?.wrapText).toBeFalsy();
  });
});

describe("exportMultiSheetToExcel", () => {
  it("satu sheet per entri, urutan & kolom masing-masing dipertahankan", async () => {
    await exportMultiSheetToExcel({
      filename: "laporan",
      sheets: [
        { name: "Ringkasan", columns: [{ header: "Total", key: "t" }], data: [{ t: 3 }] },
        { name: "Rincian", columns: [{ header: "ID", key: "id" }, { header: "Catatan", key: "n", wrap: true }], data: [{ id: "a", n: "x\ny" }, { id: "b", n: null }] },
      ],
    });
    expect(anchor.download).toBe("laporan.xlsx");
    const wb = await readBack();
    expect(wb.worksheets.map((w) => w.name)).toEqual(["Ringkasan", "Rincian"]);
    const rincian = wb.getWorksheet("Rincian")!;
    expect(rincian.getRow(1).values).toEqual([undefined, "ID", "Catatan"]);
    expect(rincian.rowCount).toBe(3);
    expect(rincian.getCell("B2").alignment).toMatchObject({ wrapText: true });
    expect(wb.getWorksheet("Ringkasan")!.getCell("A2").value).toBe(3);
  });
});
