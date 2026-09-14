import { describe, it, expect } from "vitest";
import { buildPDF } from "@/lib/pdf";
import { buildFarmPassportDoc } from "@/lib/farm-passport";
import { buildBmpMapDoc } from "@/lib/bmp-map-print";
import { buildFireMapDoc } from "@/lib/fire-map-print";
import { imageFormatOf } from "@/lib/map-capture";
import type { ParcelPassport } from "@/types/map";
import { inflateSync } from "node:zlib";
import type { jsPDF } from "jspdf";

/**
 * Teks yang tercetak di PDF jsPDF (compress: true): tiap content stream
 * di-inflate, lalu string di dalam tanda kurung operator Tj/TJ dikumpulkan.
 * Cukup untuk menegaskan "label X ada / nama Y TIDAK ada" — bukan parser PDF.
 */
function pdfText(doc: jsPDF): string {
  const bytes = Buffer.from(doc.output("arraybuffer"));
  const out: string[] = [];
  let pos = 0;
  for (;;) {
    const start = bytes.indexOf("stream", pos, "latin1");
    if (start < 0) break;
    const bodyStart = bytes[start + 6] === 0x0d ? start + 8 : start + 7;
    const end = bytes.indexOf("endstream", bodyStart, "latin1");
    if (end < 0) break;
    const raw = bytes.subarray(bodyStart, end);
    let text: string;
    try {
      text = inflateSync(raw).toString("latin1");
    } catch {
      text = raw.toString("latin1");
    }
    for (const m of text.matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj/g)) out.push(m[1].replace(/\\([()\\])/g, "$1"));
    pos = end + 9;
  }
  return out.join("\n");
}

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
      blok: "DUSUN 2",
      subGroupLv2: "KT Karya Maju",
      species: "Elaeis guineensis",
      isPsr: false,
      treeCount: 286,
      border: null,
    },
    legal: {
      documents: [
        { type: "SHM", typeRaw: "SHM (Sertifikat Hak Milik)", number: "727", holderName: "Abdul Rohman", statedArea: 0.25, issuedYear: null, custodyNote: null },
        { type: "OTHER", typeRaw: null, number: "694", holderName: null, statedArea: null, issuedYear: null, custodyNote: "surat di bank" },
      ],
      stdbs: [{ number: "1637/53/1401/6/2025", stage: "TERBIT", issuedYear: 2025, holderName: null, otherParcelIds: ["LHN-002", "LHN-003"] }],
      externalIds: [{ source: "MERIDIA", code: "ID080d781b4" }],
      programs: [{ programType: "DEMPLOT_PBU", status: "ACTIVE", startDate: "2026-01-01", endDate: null }],
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
    neighbors: [],
    neighborsOmitted: 0,
  };

  it("portrait A4, minimal 1 halaman, tanpa throw", () => {
    const doc = buildFarmPassportDoc(passport);
    expect(Math.round(doc.internal.pageSize.getWidth())).toBe(210);
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });

  it("legalitas kosong (belum ada surat/STDB/kode/program) → tetap terbit tanpa throw", () => {
    const bare: ParcelPassport = { ...passport, legal: { documents: [], stdbs: [], externalIds: [], programs: [] } };
    expect(() => buildFarmPassportDoc(bare)).not.toThrow();
  });

  it("banyak surat → pecah ke halaman berikutnya (footer per halaman), bukan terpotong (#298)", () => {
    const many: ParcelPassport = {
      ...passport,
      legal: {
        ...passport.legal,
        documents: Array.from({ length: 60 }, (_, i) => ({ type: "SKT", typeRaw: null, number: `SKT-${i + 1}`, holderName: "Nama", statedArea: 1, issuedYear: 2020, custodyNote: null })),
      },
    };
    expect(buildFarmPassportDoc(many).getNumberOfPages()).toBeGreaterThanOrEqual(2);
  });

  it("sepadan belum diisi → blok Sepadan tetap tercetak dengan label keempat arah (#326)", () => {
    const text = pdfText(buildFarmPassportDoc(passport));
    expect(text).toContain("Sepadan");
    for (const side of ["Utara", "Timur", "Selatan", "Barat"]) expect(text).toContain(side);
  });

  it("sepadan terisi → nilai tiap sisi + catatan tercetak (#326)", () => {
    const withBorder: ParcelPassport = {
      ...passport,
      parcel: { ...passport.parcel, border: { north: "Lahan Pak Budi", east: "Jalan desa", south: null, west: "Sungai Kecil", notes: "dari SKT 2019" } },
    };
    const text = pdfText(buildFarmPassportDoc(withBorder));
    expect(text).toContain("Lahan Pak Budi");
    expect(text).toContain("Jalan desa");
    expect(text).toContain("Sungai Kecil");
    expect(text).toContain("Catatan sepadan: dari SKT 2019");
  });

  const neighbor = (i: number, o: Partial<ParcelPassport["neighbors"][number]> = {}): ParcelPassport["neighbors"][number] => ({
    id: `n${i}`,
    parcelId: `LHN-10${i}`,
    geometry: { type: "Polygon", coordinates: [[[101.51, 0.74], [101.53, 0.74], [101.53, 0.76], [101.51, 0.76], [101.51, 0.74]]] },
    distanceM: 0,
    overlaps: false,
    farmerName: `Tetangga ${i}`,
    farmerCode: `SH-10${i}`,
    groupName: "Lembaga Uji",
    inScope: true,
    sameFarmer: false,
    ...o,
  });

  it("tanpa tetangga → legenda tetap tercetak berbunyi 'Tidak ada lahan lain' (#327)", () => {
    const text = pdfText(buildFarmPassportDoc(passport));
    expect(text).toContain("Lahan Tetangga");
    expect(text).toContain("Tidak ada lahan lain yang terdaftar di MIS dalam 25 m.");
  });

  it("3 tetangga → 3 baris legenda bernomor + nama pemilik + ID lahan (#327)", () => {
    const text = pdfText(buildFarmPassportDoc({ ...passport, neighbors: [neighbor(1), neighbor(2, { distanceM: 12.5 }), neighbor(3, { sameFarmer: true })] }));
    for (const n of ["Tetangga 1", "Tetangga 2", "LHN-101", "LHN-102", "LHN-103"]) expect(text).toContain(n);
    expect(text).toContain("12.5 m");
    expect(text).toContain("Petani ini");
  });

  it("tetangga di luar scope → nama petani & Lembaga TETAP tercetak (alat verifikasi lapangan, keputusan owner 2026-09-14)", () => {
    const outside = neighbor(1, { inScope: false, groupName: "Lembaga Lain" });
    const text = pdfText(buildFarmPassportDoc({ ...passport, neighbors: [outside] }));
    expect(text).toContain("Tetangga 1");
    expect(text).toContain("Lembaga Lain");
  });

  it("tetangga terpotong cap → baris '+N lahan lain' (#327)", () => {
    const text = pdfText(buildFarmPassportDoc({ ...passport, neighbors: Array.from({ length: 12 }, (_, i) => neighbor(i + 1)), neighborsOmitted: 3 }));
    expect(text).toContain("+3 lahan lain dalam 25 m tidak ditampilkan.");
  });

  it("tetangga jauh lebih besar dari bingkai → terpotong (clip), tidak melempar error (#327)", () => {
    const huge = neighbor(1, { geometry: { type: "Polygon", coordinates: [[[100, -1], [103, -1], [103, 2], [100, 2], [100, -1]]] } });
    expect(() => buildFarmPassportDoc({ ...passport, neighbors: [huge] })).not.toThrow();
  });

  it("sepadan sepanjang batas skema (4×200 + catatan 500) dipangkas 2 baris — kolom kanan tak melewati footer; 7 tetangga tetap 2 halaman (review 2026-09-14)", () => {
    const long = "x".repeat(200);
    const heavy = (n: number): ParcelPassport => ({
      ...passport,
      parcel: { ...passport.parcel, border: { north: long, east: long, south: long, west: long, notes: "y".repeat(500) } },
      neighbors: Array.from({ length: n }, (_, i) => neighbor(i + 1)),
    });
    // Section mengalir (keputusan owner 2026-09-14, mencabut "Pelatihan selalu halaman 2" #298):
    // legalitas penuh + sepadan maksimal + 7 atau 12 tetangga tetap 2 halaman, tak ada yang hilang.
    const usual = buildFarmPassportDoc(heavy(7));
    expect(usual.getNumberOfPages()).toBe(2);
    // Dipangkas: dari 4×200 karakter "x" hanya ±2 baris per sisi yang tercetak.
    expect((pdfText(usual).match(/x/g) ?? []).length).toBeLessThan(400);
    const dense = buildFarmPassportDoc(heavy(12));
    expect(dense.getNumberOfPages()).toBe(2);
    expect(pdfText(dense)).toContain("Legalitas & Dokumen");
    expect(pdfText(dense)).toContain("Pelatihan");
  });

  it("legalitas penuh tanpa tetangga/sepadan → tetap 2 halaman seperti sebelum #326/#327 (regresi tata letak)", () => {
    expect(buildFarmPassportDoc(passport).getNumberOfPages()).toBe(2);
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

describe("buildFireMapDoc (lib/fire-map-print) — Laporan Titik Api", () => {
  const base = {
    subtitle: "Smallholder Hub Group",
    kabupatenLabel: "Kampar, Pelalawan, Rokan Hulu, Siak",
    rangeLabel: "5 hari terakhir (15–19 Agu 2026)",
    exportedAt: "19 Agu 2026, 14.55 WIB",
    logo: null,
    fonts: null,
    stats: { total: 130, high: 1, nominal: 123, low: 6, inside: 6, groupsAffected: 3 },
    imageDataUrl: PNG_1PX_URL,
    imageWidthPx: 800,
    imageHeightPx: 500,
  };
  const row = (n: number) => ({
    timeWib: "17 Agu 2026, 14.29 WIB",
    satellite: "Suomi NPP",
    confidence: "Nominal (Medium)",
    frp: "3.2",
    lat: "0.70085",
    lng: "100.37555",
    groupName: `Lembaga ${n}`,
  });

  it("portrait A4: header + kartu + peta + tabel detail titik", () => {
    const doc = buildFireMapDoc({ ...base, rows: [row(1), row(2), row(3)] });
    expect(Math.round(doc.internal.pageSize.getWidth())).toBe(210);
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });

  it("tanpa titik & tanpa capture peta → placeholder + pesan kosong, tanpa throw", () => {
    const doc = buildFireMapDoc({ ...base, imageDataUrl: null, rows: [] });
    expect(doc.getNumberOfPages()).toBe(1);
  });

  it("groupMaps → halaman lampiran Peta per Lembaga", () => {
    const gm = { name: "Kepau Jaya", count: 2, shared: 1, dataUrl: PNG_1PX_URL, widthPx: 800, heightPx: 500 };
    const doc = buildFireMapDoc({ ...base, rows: [row(1)], groupMaps: [gm, { ...gm, name: "PPKS" }] });
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(2);
  });
});

// Ukuran berkas PDF (#276): capture peta di-encode JPEG + diperkecil, sementara
// placeholder & logo tetap PNG — format `addImage` diturunkan dari isi data URL,
// bukan dipatok, agar keduanya benar.
describe("imageFormatOf (lib/map-capture)", () => {
  it("JPEG untuk capture peta, PNG untuk sisanya", () => {
    expect(imageFormatOf("data:image/jpeg;base64,/9j/4AAQ")).toBe("JPEG");
    expect(imageFormatOf(PNG_1PX_URL)).toBe("PNG");
    expect(imageFormatOf("")).toBe("PNG");
  });
});
