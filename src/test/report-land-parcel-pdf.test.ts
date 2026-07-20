import { describe, it, expect } from "vitest";
import { buildLandParcelReportDoc } from "@/lib/report-land-parcel-pdf";

// Verifikasi empiris via jsPDF asli (pelajaran #174: bug print tak tertangkap
// build/test biasa) — build dipisah dari save sehingga dokumen bisa diperiksa.

const square = (lon: number, lat: number, size = 0.01) => ({
  type: "Polygon",
  coordinates: [[[lon, lat], [lon + size, lat], [lon + size, lat + size], [lon, lat + size], [lon, lat]]],
});

const COLUMNS = [
  { header: "No", key: "no" },
  { header: "Lembaga Petani", key: "lembagaTani" },
  { header: "Nama Petani", key: "namaPetani" },
  { header: "ID Petani", key: "idPetani" },
  { header: "ID Lahan", key: "idLahan" },
  { header: "Kelompok Tani", key: "kelompokTani" },
];

const baseInput = (n: number, withGeometry: boolean) => ({
  filename: "test",
  metadata: [
    { label: "Distrik", value: "Siak" },
    { label: "Lembaga Petani", value: "Lembaga Uji" },
  ],
  columns: COLUMNS,
  data: Array.from({ length: n }, (_, i) => ({
    no: i + 1,
    lembagaTani: "Lembaga Uji",
    namaPetani: `Petani ${i + 1}`,
    idPetani: `SH-${i + 1}`,
    idLahan: `LHN-${i + 1}`,
    kelompokTani: "KT Uji",
  })),
  mapParcels: Array.from({ length: n }, (_, i) => ({
    no: i + 1,
    geometry: withGeometry ? square(101 + (i % 10) * 0.02, 0.5 + Math.floor(i / 10) * 0.02) : null,
    labelLines: [String(i + 1)],
  })),
});

describe("buildLandParcelReportDoc", () => {
  it("landscape A4: halaman 1 peta + halaman tabel, tanpa error (60 lahan)", () => {
    const doc = buildLandParcelReportDoc(baseInput(60, true));
    // Landscape A4 = 297 × 210 mm.
    expect(Math.round(doc.internal.pageSize.getWidth())).toBe(297);
    expect(Math.round(doc.internal.pageSize.getHeight())).toBe(210);
    // Minimal 2 halaman: peta + tabel.
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(2);
  });

  it("semua lahan tanpa geometri → tetap terbit (placeholder peta), tanpa throw", () => {
    const doc = buildLandParcelReportDoc(baseInput(3, false));
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(2);
  });

  it("0 baris → tetap terbit tanpa throw", () => {
    expect(() => buildLandParcelReportDoc(baseInput(0, true))).not.toThrow();
  });

  it("grid index 3×3: ikhtisar + halaman per sel berisi + tabel", () => {
    const doc = buildLandParcelReportDoc({ ...baseInput(60, true), grid: { rows: 3, cols: 3 } });
    // 60 lahan grid 10×6 sebaran merata pada 3×3 → 9 sel berisi:
    // 1 ikhtisar + 9 halaman sel + ≥1 halaman tabel.
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(11);
  });

  it("grid non-persegi 2×3 → tetap terbit dengan halaman sel", () => {
    const doc = buildLandParcelReportDoc({ ...baseInput(60, true), grid: { rows: 2, cols: 3 } });
    // 6 sel berisi: 1 ikhtisar + 6 sel + ≥1 tabel.
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(8);
  });

  it("label multi-baris (ceklis Nama/ID) → tetap terbit tanpa throw", () => {
    const input = baseInput(12, true);
    input.mapParcels = input.mapParcels.map((p, i) => ({
      ...p,
      labelLines: [String(p.no), `Petani ${i + 1}`, `SH-${i + 1}`, `LHN-${i + 1}`],
    }));
    const doc = buildLandParcelReportDoc({ ...input, grid: { rows: 2, cols: 2 } });
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(3);
  });
});
