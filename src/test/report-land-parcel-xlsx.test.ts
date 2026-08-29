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
describe("buildLandParcelWorkbook — sheet Ringkasan", () => {
  const INFO = [
    { section: "Filter Legalitas", label: "Cakupan Pendataan", value: "Hanya lahan yang sudah didata" },
    { section: "Ringkasan Legalitas", label: "Ada Surat", value: "478", note: "97% dari 495 lahan yang sudah didata" },
  ];

  it("ringkasan jadi sheet TERSENDIRI di posisi pertama", () => {
    const wb = buildLandParcelWorkbook({ columns: COLS, fullData: [row(1), row(2)], infoSheet: INFO });
    expect(wb.worksheets.map((w) => w.name)).toEqual(["Ringkasan", "Lahan"]);
    const ws = wb.getWorksheet("Ringkasan")!;
    expect([ws.getCell("A1").value, ws.getCell("B1").value, ws.getCell("C1").value, ws.getCell("D1").value]).toEqual([
      "Bagian", "Keterangan", "Nilai", "Catatan",
    ]);
    expect(ws.getCell("A2").value).toBe("Filter Legalitas");
    expect(ws.getCell("D3").value).toBe("97% dari 495 lahan yang sudah didata");
  });

  it("sheet data tetap mulai di baris 1 — AutoFilter/pivot Excel tidak rusak", () => {
    const wb = buildLandParcelWorkbook({
      columns: COLS,
      fullData: [row(1), row(2)],
      cellSheets: [{ label: "A1", data: [row(1)] }],
      infoSheet: INFO,
    });
    for (const name of ["Lahan", "Peta A1"]) {
      const ws = wb.getWorksheet(name)!;
      expect(ws.getCell("A1").value, name).toBe("No");
    }
    expect(wb.getWorksheet("Lahan")!.rowCount).toBe(3); // header + 2 baris
  });

  it("tanpa infoSheet, workbook-nya persis seperti sebelumnya", () => {
    const wb = buildLandParcelWorkbook({ columns: COLS, fullData: [row(1)] });
    expect(wb.worksheets.map((w) => w.name)).toEqual(["Lahan"]);
    expect(wb.getWorksheet("Lahan")!.getCell("A1").value).toBe("No");
  });
});
