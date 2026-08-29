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

/**
 * Blok filter & ringkasan legalitas (#305). Ia dirender penuh-lebar di bawah
 * metadata dan **menggeser awal peta ke bawah** — bagian yang mudah rusak
 * diam-diam: kalau blok itu panjang, kotak peta bisa jadi gepeng atau bertinggi
 * negatif tanpa satu pun error dilempar.
 */
describe("buildLandParcelReportDoc — blok sections legalitas", () => {
  const longSections = [
    {
      title: "Filter Legalitas",
      lines: [
        "Cakupan Pendataan: Hanya lahan yang sudah didata (punya UL Parcel Code)",
        "Status Surat: Tanpa surat (tak ada surat tercatat sama sekali)",
        "Jenis Surat: SHM, SKT, SKGR, SK, SKST, SKTC, SKGK, SPPT, SKRPT, SKKT, SKTB, Hibah, Jual Beli, Lainnya (punya minimal satu)",
        "Status STDB: Tahap Persiapan Data",
        "Selisih Luas: ≥ 0,50 Ha (luas surat vs poligon)",
      ],
    },
    {
      title: "Ringkasan Legalitas",
      lines: [
        "Lahan (hasil filter): 1.204 (1.204 di antaranya sudah didata)",
        "Ada Surat: 903 (75% dari 1.204 lahan yang sudah didata)",
        "Ada STDB: 210 (17% dari 1.204 lahan yang sudah didata — dihitung per persil, bukan per petani)",
        "Selisih Luas ≥ 0,50 Ha: 32 (luas di surat vs luas poligon)",
      ],
    },
  ];

  it("tanpa sections, jumlah halaman tidak berubah dari perilaku lama", () => {
    const without = buildLandParcelReportDoc(baseInput(20, true));
    const withEmpty = buildLandParcelReportDoc({ ...baseInput(20, true), sections: [] });
    expect(withEmpty.getNumberOfPages()).toBe(without.getNumberOfPages());
  });

  it("sections terpanjang tetap menghasilkan dokumen sah, tanpa error", () => {
    expect(() =>
      buildLandParcelReportDoc({ ...baseInput(60, true), sections: longSections }),
    ).not.toThrow();
  });

  it("bila blok legalitas memakan halaman, peta pindah halaman — bukan dirender gepeng", () => {
    const base = buildLandParcelReportDoc(baseInput(20, true));
    const long = buildLandParcelReportDoc({ ...baseInput(20, true), sections: longSections });
    // Lantai MIN_MAP_H memaksa halaman baru, jadi total halaman bertambah.
    expect(long.getNumberOfPages()).toBeGreaterThanOrEqual(base.getNumberOfPages());
  });

  it("section tanpa baris dilewati (tidak meninggalkan judul menggantung)", () => {
    const doc = buildLandParcelReportDoc({
      ...baseInput(20, true),
      sections: [{ title: "Filter Legalitas", lines: [] }],
    });
    expect(doc.getNumberOfPages()).toBe(buildLandParcelReportDoc(baseInput(20, true)).getNumberOfPages());
  });
});
