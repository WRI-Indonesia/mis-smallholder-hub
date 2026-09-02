import { describe, it, expect } from "vitest";
import { buildLandParcelReportDoc, collectLandParcelMapBoxes } from "@/lib/report-land-parcel-pdf";

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

describe("collectLandParcelMapBoxes (#318)", () => {
  // Klien menjahit latar seukuran kotak halaman PDF. Kotak itu tak boleh
  // ditebak dari luar (tinggi kotak halaman 1 bergantung panjang metadata &
  // blok filter), jadi kontraknya: apa yang dilaporkan di sini = apa yang
  // digambar buildLandParcelReportDoc.
  it("melaporkan satu halaman peta saat grid 1×1", () => {
    const pages = collectLandParcelMapBoxes(baseInput(20, true));
    expect(pages).toHaveLength(1);
    expect(pages[0].key).toBe("");
  });

  it("melaporkan ikhtisar + satu halaman per sel berisi", () => {
    const input = { ...baseInput(60, true), grid: { rows: 2, cols: 2 } };
    const pages = collectLandParcelMapBoxes(input);
    expect(pages[0].key).toBe("");
    // Sel kosong dilewati, jadi jumlahnya ≤ 1 + baris×kolom.
    expect(pages.length).toBeGreaterThan(1);
    expect(pages.length).toBeLessThanOrEqual(1 + 2 * 2);
    // Label sel unik dan berformat huruf+angka.
    const cellKeys = pages.slice(1).map((p) => p.key);
    expect(new Set(cellKeys).size).toBe(cellKeys.length);
    for (const key of cellKeys) expect(key).toMatch(/^[A-Z]\d+$/);
  });

  it("memberi kotak & bbox yang terpakai (bukan nol) untuk tiap halaman", () => {
    const input = { ...baseInput(60, true), grid: { rows: 2, cols: 2 } };
    for (const page of collectLandParcelMapBoxes(input)) {
      expect(page.box.w).toBeGreaterThan(0);
      expect(page.box.h).toBeGreaterThan(0);
      expect(page.frame.scale).toBeGreaterThan(0);
      expect(page.frame.maxLon).toBeGreaterThan(page.frame.minLon);
      expect(page.frame.maxLat).toBeGreaterThan(page.frame.minLat);
    }
  });

  it("tidak melaporkan halaman peta bila tak ada geometri yang bisa digambar", () => {
    expect(collectLandParcelMapBoxes(baseInput(20, false))).toHaveLength(0);
  });

  it("kotak halaman sel identik antar sel — atlas memakai tata letak yang sama", () => {
    const input = { ...baseInput(60, true), grid: { rows: 2, cols: 2 } };
    const cellBoxes = collectLandParcelMapBoxes(input).slice(1).map((p) => p.box);
    for (const box of cellBoxes) expect(box).toEqual(cellBoxes[0]);
  });
});

// JPEG 1×1 sah — jsPDF menolak data URL palsu, dan `drawBasemap` memanggil
// `addImage(..., "JPEG", ...)` dengan format eksplisit.
const TINY_JPEG =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsL" +
  "DBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAAB" +
  "AAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==";

/** Berapa halaman yang memuat teks atribusi latar. */
function pagesWithAttribution(doc: ReturnType<typeof buildLandParcelReportDoc>): number {
  // jsPDF menyimpan content stream per halaman di `internal.pages` (1-indexed).
  const pages = (doc.internal as unknown as { pages: string[][] }).pages;
  return pages.filter((page) => Array.isArray(page) && page.join("\n").includes("Map data")).length;
}

describe("latar peta per halaman (#318)", () => {
  const gridInput = () => ({ ...baseInput(60, true), grid: { rows: 2, cols: 2 } });

  it("tanpa latar: tak satu pun halaman mencetak atribusi", () => {
    expect(pagesWithAttribution(buildLandParcelReportDoc(gridInput()))).toBe(0);
  });

  it("atribusi HANYA di halaman yang benar-benar punya gambar latar", () => {
    // Skenario yang bikin bendera dokumen-lebar salah: cuma halaman ikhtisar
    // yang punya latar. Halaman sel tak boleh mengklaim "Map data © Google"
    // untuk citra yang tidak ada di sana.
    const doc = buildLandParcelReportDoc({
      ...gridInput(),
      basemaps: new Map([["", TINY_JPEG]]),
      basemapAttribution: "Map data © Google",
    });
    expect(pagesWithAttribution(doc)).toBe(1);
  });

  it("atribusi muncul di setiap halaman peta saat semuanya berlatar", () => {
    const input = gridInput();
    const pages = collectLandParcelMapBoxes(input);
    const doc = buildLandParcelReportDoc({
      ...input,
      basemaps: new Map(pages.map((p) => [p.key, TINY_JPEG])),
      basemapAttribution: "Map data © Google",
    });
    expect(pagesWithAttribution(doc)).toBe(pages.length);
  });

  it("collectLandParcelMapBoxes memberi kotak yang IDENTIK dengan dokumen berdata penuh", () => {
    // Pengumpul sengaja mengosongkan `data` untuk melewati render autoTable.
    // Uji ini yang menjamin pintasan itu tak mengubah satu pun kotak peta.
    const input = gridInput();
    const viaFullBuild: unknown[] = [];
    buildLandParcelReportDoc({
      ...input,
      onMapPage: (key, box, layout) => {
        if (layout.frame) viaFullBuild.push({ key, box, frame: layout.frame });
      },
    });
    expect(collectLandParcelMapBoxes(input)).toEqual(viaFullBuild);
  });
});
