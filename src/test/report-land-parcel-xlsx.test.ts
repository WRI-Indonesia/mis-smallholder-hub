import { describe, it, expect } from "vitest";
import { buildLandParcelWorkbook } from "@/lib/report-land-parcel-xlsx";

// PNG 1×1 valid untuk uji penempelan gambar.
const PNG_1PX =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const IMG = { base64: PNG_1PX, widthPx: 560, heightPx: 360 };

const COLS = [
  { header: "No", key: "no" },
  { header: "Nama Petani", key: "namaPetani" },
];
const row = (no: number) => ({ no, namaPetani: `Petani ${no}` });

describe("buildLandParcelWorkbook", () => {
  it("sheet 'Lahan' penuh + gambar peta index", () => {
    const wb = buildLandParcelWorkbook({
      columns: COLS,
      fullData: [row(1), row(2), row(3)],
      overviewImage: IMG,
    });
    expect(wb.worksheets.map((w) => w.name)).toEqual(["Lahan"]);
    const ws = wb.getWorksheet("Lahan")!;
    expect(ws.rowCount).toBe(4); // header + 3 baris
    expect(ws.getImages()).toHaveLength(1);
  });

  it("grid aktif → satu sheet per sel berisi subset + gambar peta sel", () => {
    const wb = buildLandParcelWorkbook({
      columns: COLS,
      fullData: [row(1), row(2), row(3)],
      overviewImage: IMG,
      cellSheets: [
        { label: "A1", data: [row(1)], image: IMG },
        { label: "B2", data: [row(2), row(3)], image: IMG },
      ],
    });
    expect(wb.worksheets.map((w) => w.name)).toEqual(["Lahan", "Peta A1", "Peta B2"]);
    expect(wb.getWorksheet("Peta A1")!.rowCount).toBe(2);
    expect(wb.getWorksheet("Peta B2")!.rowCount).toBe(3);
    expect(wb.getWorksheet("Peta B2")!.getImages()).toHaveLength(1);
  });

  it("tanpa gambar (geometri kosong) → workbook tetap terbit", () => {
    const wb = buildLandParcelWorkbook({
      columns: COLS,
      fullData: [row(1)],
      overviewImage: null,
      cellSheets: [{ label: "A1", data: [row(1)], image: null }],
    });
    expect(wb.getWorksheet("Lahan")!.getImages()).toHaveLength(0);
    expect(wb.getWorksheet("Peta A1")!.getImages()).toHaveLength(0);
  });
});

/**
 * Filter aktif ikut ke berkas (#305). Tanpa ini, ekspor hasil filter "tanpa
 * surat" terbaca persis seperti roster lengkap begitu berkasnya beredar lepas
 * dari layar yang memfilternya.
 */
describe("buildLandParcelWorkbook — catatan filter", () => {
  it("catatan filter disisipkan di atas header, header tetap utuh", () => {
    const wb = buildLandParcelWorkbook({
      columns: COLS,
      fullData: [row(1), row(2)],
      filterNotes: ["Cakupan Pendataan: Hanya lahan yang sudah didata", "Status Surat: Tanpa surat"],
    });
    const ws = wb.getWorksheet("Lahan")!;
    expect(ws.getCell("A1").value).toBe("Cakupan Pendataan: Hanya lahan yang sudah didata");
    expect(ws.getCell("A2").value).toBe("Status Surat: Tanpa surat");
    // 2 catatan + 1 baris kosong pemisah → header di baris 4, data mulai baris 5.
    expect(ws.getCell("A4").value).toBe("No");
    expect(ws.getCell("B5").value).toBe("Petani 1");
    expect(ws.rowCount).toBe(6);
  });

  it("tanpa catatan filter, tata letaknya persis seperti sebelumnya", () => {
    const wb = buildLandParcelWorkbook({ columns: COLS, fullData: [row(1)] });
    const ws = wb.getWorksheet("Lahan")!;
    expect(ws.getCell("A1").value).toBe("No");
    expect(ws.rowCount).toBe(2);
  });

  it("catatan ikut ke tiap sheet sel grid, bukan hanya sheet utama", () => {
    const wb = buildLandParcelWorkbook({
      columns: COLS,
      fullData: [row(1)],
      cellSheets: [{ label: "A1", data: [row(1)] }],
      filterNotes: ["Status STDB: Tanpa STDB"],
    });
    expect(wb.getWorksheet("Peta A1")!.getCell("A1").value).toBe("Status STDB: Tanpa STDB");
  });
});
