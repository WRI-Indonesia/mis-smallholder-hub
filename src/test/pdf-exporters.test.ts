import { describe, it, expect } from "vitest";
import { buildPDF } from "@/lib/pdf";
import { buildFarmPassportDoc } from "@/lib/farm-passport";
import { buildBmpMapDoc } from "@/lib/bmp-map-print";
import type { ParcelPassport } from "@/types/map";

// TD-019: exporter lama dipisah build-vs-save (pola #179) — test struktural
// memverifikasi dokumen jsPDF asli (orientasi/halaman/tanpa-throw), karena
// bug print (#174/#179) tak tertangkap build/test biasa.

// PNG 1×1 data URL untuk addImage.
const PNG_1PX_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

describe("buildPDF (lib/pdf)", () => {
  const COLS = [
    { header: "No", key: "no" },
    { header: "Nama", key: "nama" },
  ];
  const DATA = Array.from({ length: 80 }, (_, i) => ({ no: i + 1, nama: `Baris ${i + 1}` }));

  it("portrait A4 default + multi halaman untuk data panjang", () => {
    const doc = buildPDF({
      title: "LAPORAN UJI",
      subtitle: "Subjudul",
      metadata: [{ label: "Distrik", value: "Siak" }],
      columns: COLS,
      data: DATA,
    });
    expect(Math.round(doc.internal.pageSize.getWidth())).toBe(210);
    expect(Math.round(doc.internal.pageSize.getHeight())).toBe(297);
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(2);
  });

  it("orientation landscape dihormati + data kosong tanpa throw", () => {
    const doc = buildPDF({ title: "T", columns: COLS, data: [], orientation: "landscape" });
    expect(Math.round(doc.internal.pageSize.getWidth())).toBe(297);
    expect(doc.getNumberOfPages()).toBe(1);
  });
});

describe("buildFarmPassportDoc (lib/farm-passport)", () => {
  const passport: ParcelPassport = {
    farmer: {
      name: "Budi Santoso",
      code: "SH-0001",
      gender: "MALE",
      birthPlace: "Siak",
      birthDate: "1980-01-15",
      nik: "1408011501800001",
      address: "Kampung Uji",
      joinedYear: 2020,
    },
    group: { name: "Lembaga Uji", code: "ISH-1", districtName: "Siak", provinceName: "Riau" },
    parcel: {
      parcelId: "LHN-001",
      area: 2.5,
      landStatus: "Owned",
      cropType: "Kelapa Sawit",
      plantingYear: 2016,
      notes: null,
      centroid: [101.5, 0.75],
      geometry: {
        type: "Polygon",
        coordinates: [[[101.49, 0.74], [101.51, 0.74], [101.51, 0.76], [101.49, 0.76], [101.49, 0.74]]],
      },
    },
    training: [
      { code: "PAKET_1_BMP_PC_RSPO_NKT", label: "BMP, P&C RSPO & NKT", completed: true, date: "2025-05-16" },
      { code: "PAKET_2_MK", label: "Manajemen Kelompok", completed: false, date: null },
    ],
    production: {
      monthly: [500, 600, 0, 0, 700, 0, 0, 0, 0, 0, 0, 0],
      byYear: [{ year: 2025, monthly: [500, 600, 0, 0, 700, 0, 0, 0, 0, 0, 0, 0], total: 1800 }],
      totalKg: 1800,
      recordCount: 3,
    },
  };

  it("portrait A4, minimal 1 halaman, tanpa throw", () => {
    const doc = buildFarmPassportDoc(passport);
    expect(Math.round(doc.internal.pageSize.getWidth())).toBe(210);
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });

  it("geometri tak tersedia (ring < 3 titik) → tetap terbit tanpa throw", () => {
    const broken: ParcelPassport = {
      ...passport,
      parcel: { ...passport.parcel, geometry: { type: "Polygon", coordinates: [[]] } },
      production: { monthly: Array(12).fill(0), byYear: [], totalKg: 0, recordCount: 0 },
      training: [],
    };
    expect(() => buildFarmPassportDoc(broken)).not.toThrow();
  });
});

describe("buildBmpMapDoc (lib/bmp-map-print)", () => {
  const base = {
    title: "Peta BMP",
    subtitle: "Lembaga Uji",
    imageDataUrl: PNG_1PX_URL,
    imageWidthPx: 800,
    imageHeightPx: 500,
    legend: [
      { label: "Baik", color: "#16a34a", count: 3 },
      { label: "Tidak Ada Data", color: "#9ca3af", count: 1, outlineOnly: true },
    ],
  };

  it("landscape A4: halaman peta + halaman matriks ketersediaan", () => {
    const doc = buildBmpMapDoc({
      ...base,
      matrix: {
        periods: ["2025-01", "2025-02"],
        rows: [
          { name: "Budi", farmerCode: "SH-0001", parcelId: "LHN-001", production: { "2025-01": 500 } },
          { name: "Ani", farmerCode: "SH-0002", parcelId: "LHN-002", production: {} },
        ],
      },
    });
    expect(Math.round(doc.internal.pageSize.getWidth())).toBe(297);
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(2);
  });
});
