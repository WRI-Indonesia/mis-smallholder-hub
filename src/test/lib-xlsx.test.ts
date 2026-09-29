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

  it("KARAKTERISASI — auto-fit lebar kolom tak pernah jalan (ExcelJS memberi lebar bawaan 9)", async () => {
    // BUG (dilaporkan, belum diperbaiki): ExcelJS 4.x mengisi `column.width = 9`
    // saat definisi kolom tanpa width, jadi cabang `if (!column.width)` di
    // xlsx.ts tidak pernah terpenuhi — nilai panjang tetap selebar bawaan dan
    // lebar tidak ditulis ke berkas. Saat diperbaiki, ubah harapan di bawah ke
    // lebar hasil auto-fit (mis. 22 untuk nilai 19 karakter, maks 50).
    await exportToExcel({
      filename: "x",
      columns: [{ header: "C", key: "c" }],
      data: [{ c: "1234567890123456789" }],
    });
    const ws = (await readBack()).getWorksheet("Data")!;
    expect(ws.getColumn(1).width).toBeUndefined();
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
