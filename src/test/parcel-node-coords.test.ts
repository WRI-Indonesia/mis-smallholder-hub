import { describe, it, expect } from "vitest";
import { formatParcelNodes, EXCEL_CELL_MAX_CHARS } from "@/lib/parcel-node-coords";

/** Kolom Koordinat unduhan Excel lahan (#370): "Lintang,Bujur"; "; " antar-node; " | " antar-ring. */

const square = (x: number, y: number, d = 0.001) => [[x, y], [x + d, y], [x + d, y + d], [x, y + d], [x, y]];

describe("formatParcelNodes", () => {
  it("Polygon sederhana: urutan lat,lon, 6 desimal, node penutup tidak diulang", () => {
    const r = formatParcelNodes({ type: "Polygon", coordinates: [[[101.1234564, -0.5123451], [101.1235, -0.512399], [101.123602, -0.512401], [101.1234564, -0.5123451]]] });
    expect(r).toEqual({
      text: "-0.512345,101.123456; -0.512399,101.123500; -0.512401,101.123602",
      count: 3,
      truncated: false,
    });
  });

  it("ring yang tidak ditutup tetap dihitung apa adanya", () => {
    const r = formatParcelNodes({ type: "Polygon", coordinates: [[[1, 2], [3, 4], [5, 6]]] });
    expect(r.count).toBe(3);
    expect(r.text).toBe("2.000000,1.000000; 4.000000,3.000000; 6.000000,5.000000");
  });

  it("Polygon berlubang: ring luar dulu, lubang dipisah ' | '", () => {
    const r = formatParcelNodes({ type: "Polygon", coordinates: [square(0, 0, 1), square(0.2, 0.2, 0.1)] });
    expect(r.count).toBe(8);
    const rings = r.text.split(" | ");
    expect(rings).toHaveLength(2);
    expect(rings[0].split("; ")).toHaveLength(4);
    expect(rings[0].startsWith("0.000000,0.000000")).toBe(true);
    expect(rings[1].startsWith("0.200000,0.200000")).toBe(true);
  });

  it("MultiPolygon: semua ring semua bagian ikut", () => {
    const r = formatParcelNodes({ type: "MultiPolygon", coordinates: [[square(0, 0)], [square(1, 1), square(1.0002, 1.0002, 0.0001)]] });
    expect(r.count).toBe(12);
    expect(r.text.split(" | ")).toHaveLength(3);
  });

  it("geometri kosong / tak dikenal / koordinat rusak → teks kosong, count 0", () => {
    expect(formatParcelNodes(null)).toEqual({ text: "", count: 0, truncated: false });
    expect(formatParcelNodes({ type: "Point", coordinates: [1, 2] })).toEqual({ text: "", count: 0, truncated: false });
    expect(formatParcelNodes({ type: "Polygon", coordinates: [[["a", "b"], [1, NaN]]] })).toEqual({ text: "", count: 0, truncated: false });
  });

  it("melewati batas sel Excel: dipotong pada node utuh + penanda, count tetap penuh", () => {
    const n = 2000; // ~22 karakter/node → ~44.000 karakter > 32.767
    const ring = Array.from({ length: n }, (_, i) => [101 + i * 1e-6, -0.5 - i * 1e-6]);
    const r = formatParcelNodes({ type: "Polygon", coordinates: [ring] });
    expect(r.truncated).toBe(true);
    expect(r.count).toBe(n);
    expect(r.text.length).toBeLessThanOrEqual(EXCEL_CELL_MAX_CHARS);
    const m = r.text.match(/^(.*) … \((\d+) node lagi\)$/);
    expect(m).not.toBeNull();
    const shown = m![1].split("; ");
    // Setiap node yang tampil utuh, dan tampil + sisa = total.
    for (const node of shown) expect(node).toMatch(/^-?\d+\.\d{6},-?\d+\.\d{6}$/);
    expect(shown.length + Number(m![2])).toBe(n);
  });

  it("batas kecil: pemotongan melintasi ring memakai pemisah yang benar", () => {
    const r = formatParcelNodes({ type: "Polygon", coordinates: [square(0, 0), square(1, 1)] }, 140);
    expect(r.truncated).toBe(true);
    expect(r.count).toBe(8);
    expect(r.text.length).toBeLessThanOrEqual(140);
    expect(r.text).toContain(" | ");
  });
});
