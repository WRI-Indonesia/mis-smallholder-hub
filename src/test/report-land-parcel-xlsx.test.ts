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
