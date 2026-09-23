import { describe, it, expect } from "vitest";
import { buildPDF } from "@/lib/pdf";
import { buildFarmPassportDoc, passportMapFrame } from "@/lib/farm-passport";
import { buildLayerReportDoc, graticuleStep } from "@/lib/layer-report-pdf";
import { buildBmpMapDoc } from "@/lib/bmp-map-print";
import { buildFireMapDoc } from "@/lib/fire-map-print";
import { imageFormatOf } from "@/lib/map-capture";
import type { ParcelPassport } from "@/types/map";
import { pdfText } from "./pdf-text";

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
      nkt: null,
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
    markers: [],
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

  it("NKT (#328): belum dinilai → baris 'NKT  Belum dinilai' tanpa badge; terdampak → badge + ringkasan kategori/luas", () => {
    const none = pdfText(buildFarmPassportDoc(passport));
    expect(none).toContain("Belum dinilai");
    expect(none).not.toContain("Terdampak NKT");
    const affected: ParcelPassport = {
      ...passport,
      parcel: { ...passport.parcel, nkt: { status: "AFFECTED", categories: ["NKT_4"], affectedAreaHa: 0.088, affectedLengthM: 176, assessedAt: "2025-03-12T00:00:00.000Z", assessor: "HJP", source: null } },
    };
    const text = pdfText(buildFarmPassportDoc(affected));
    expect((text.match(/Terdampak NKT/g) ?? []).length).toBeGreaterThanOrEqual(2); // badge header + baris NKT
    expect(text).toContain("NKT 4");
    expect(text).toContain("0,09 ha");
  });

  it("Patok (#329): tanpa patok → tidak ada section; ada patok → tabel 'Patok Batas' bernomor, kolom Bahan, lahan pemakai lain — tanpa kolom NKT turunan (#345)", () => {
    expect(pdfText(buildFarmPassportDoc(passport))).not.toContain("Patok Batas");
    const withMarkers: ParcelPassport = {
      ...passport,
      markers: [
        { sequenceNo: 1, code: "SH-PTK-000001", longitude: 101.1912, latitude: 0.5235, condition: "PRESENT", type: "CONCRETE", installedAt: "2026-09-01T00:00:00.000Z", sharedWith: ["SH-0002.A"] },
        { sequenceNo: 2, code: "SH-PTK-000002", longitude: 101.1918, latitude: 0.5235, condition: "NOT_INSTALLED", type: null, installedAt: null, sharedWith: [] },
      ],
    };
    const text = pdfText(buildFarmPassportDoc(withMarkers));
    expect(text).toContain("Patok Batas");
    expect(text).toContain("Beton");
    expect(text).toContain("Belum dipasang");
    expect(text).toContain("SH-0002.A");
    expect(text).toContain("SH-PTK-000001");
    expect(text).toContain("101.191200");
  });

  it("bingkai peta memuat patok di luar margin 50 m — patok GPS sah sampai 100 m dari batas, gambar di-clip (review 2026-09-15)", () => {
    // Lahan ±80 m: margin = max(40% span, 50 m) = 50 m; patok 80 m di timur batas sebelumnya terpotong.
    const D = 0.0007; // ≈ 78 m
    const ring = [[101.19, 0.52], [101.19 + D, 0.52], [101.19 + D, 0.52 + D], [101.19, 0.52 + D], [101.19, 0.52]];
    const far = { longitude: 101.19 + D + 80 / 111_320, latitude: 0.52 + D / 2 };
    const tanpa = passportMapFrame([ring], []);
    expect(far.longitude).toBeGreaterThan(tanpa.maxLon);
    const dengan = passportMapFrame([ring], [far]);
    expect(dengan.maxLon).toBeGreaterThan(far.longitude);
    // Lahan tetap terbaca: lebar lahan masih ≥ ¼ lebar bingkai walau patok di jarak maksimal (bukan jadi titik).
    expect(D / (dengan.maxLon - dengan.minLon)).toBeGreaterThan(0.25);
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

/**
 * Posisi-y tiap penempatan gambar pada content stream PDF (unit PDF, origin
 * kiri-bawah). Nilai ≤ 0 berarti gambar digambar di luar halaman — jsPDF
 * menerimanya tanpa galat, jadi hanya koordinat ini yang membuktikannya.
 */
function imagePlacementYs(doc: ReturnType<typeof buildFireMapDoc>): number[] {
  const pages = (doc as unknown as { internal: { pages: string[][] } }).internal.pages;
  const ys: number[] = [];
  for (let i = 1; i < pages.length; i++) {
    const body = (pages[i] ?? []).join("\n");
    for (const m of body.matchAll(/[-\d.]+ 0 0 [-\d.]+ [-\d.]+ ([-\d.]+) cm/g)) ys.push(Number(m[1]));
  }
  return ys;
}

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

  // Laporan bulanan (#365): judul & label meta berganti, tiga seksi baru
  // setelah kartu, catatan metodologi menyebut sumber + tanggal kosong.
  describe("varian Laporan Bulanan (#365)", () => {
    const daily = Array.from({ length: 31 }, (_, i) => {
      const date = `2025-01-${String(i + 1).padStart(2, "0")}`;
      const total = i === 9 ? 40 : i % 3; // puncak 10 Jan
      return { date, inside: Math.min(total, 2), outside: Math.max(0, total - 2), total, available: date !== "2025-01-20" };
    });
    const monthly = {
      daily,
      byKabupaten: [
        { name: "Kampar", total: 30, inside: 4, high: 3 },
        { name: "Siak", total: 12, inside: 2, high: 0 },
        { name: "Kab. Lainnya", total: 88, inside: 0, high: 10 },
      ],
      byGroup: [{ name: "Kepau Jaya", districtName: "Kampar", count: 4, high: 3, shared: 1 }],
      sourceNote: "arsip NASA FIRMS VIIRS SNPP Standard Processing (data terproses ulang)",
      missingDates: ["2025-01-20"],
    };
    const opts = {
      ...base,
      rangeLabel: "Januari 2025 (1–31 Jan 2025)",
      rows: [row(1)],
      monthly,
    };

    it("judul 'Laporan Bulanan', meta 'Periode', dan tiga seksi rekap tercetak", () => {
      const text = pdfText(buildFireMapDoc(opts));
      expect(text).toContain("Laporan Bulanan Titik Api (Hotspot)");
      expect(text).toContain("Periode: ");
      // En dash tidak terdekode pdfText (WinAnsi helvetica) — cek dua sisinya.
      expect(text).toContain("Januari 2025 (1");
      expect(text).toContain("31 Jan 2025)");
      expect(text).toContain("Tren Harian");
      expect(text).toContain("Rekap per Kabupaten");
      expect(text).toContain("Rekap per Lembaga (ber-titik api)");
      // Baris tren: hari puncak, hari kosong ditandai, bukan 0.
      expect(text).toContain("Jum, 10 Jan");
      expect(text).toContain("tidak tersedia di FIRMS");
      // Rekap kabupaten + total; rekap lembaga.
      expect(text).toContain("Kab. Lainnya");
      expect(text).toContain("Kepau Jaya");
    });

    it("catatan metodologi menyebut sumber yang dipakai & tanggal kosong, bukan 'jeda ±3 jam' NRT", () => {
      const text = pdfText(buildFireMapDoc(opts));
      expect(text).toContain("Standard Processing");
      expect(text).toContain("20 Jan 2025");
      expect(text).toContain("TIDAK termasuk dalam angka");
      expect(text).not.toContain("jeda pembaruan data");
    });

    it("tanpa lembaga ber-titik api → kalimat kosong di rekap lembaga, tanpa throw", () => {
      const text = pdfText(buildFireMapDoc({ ...opts, rows: [], monthly: { ...monthly, byGroup: [] } }));
      expect(text).toContain("Tidak ada titik api dalam boundary lembaga pada periode ini.");
    });

    it("seksi bulanan panjang → peta pindah halaman, tidak tergambar di luar halaman", () => {
      // drawMapImage tidak pernah addPage sendiri dan `y` sesudah tiga seksi
      // bulanan bisa di mana saja. Tanpa guard, judul + peta 88 mm ditempatkan
      // pada y NEGATIF (terukur -37 mm pada 5 kab/14 lembaga, -179 mm pada
      // 13/14) — di luar MediaBox, jadi peta hilang diam-diam dari PDF tanpa
      // menambah halaman. Jumlah halaman karena itu bukan sinyal; yang diuji
      // adalah koordinat penempatan gambar di content stream.
      const padat = {
        ...opts,
        monthly: {
          ...monthly,
          byKabupaten: Array.from({ length: 13 }, (_, i) => ({
            name: `Kabupaten ${i + 1}`,
            total: 10,
            inside: 2,
            high: 1,
          })),
          byGroup: Array.from({ length: 14 }, (_, i) => ({
            name: `Lembaga ${i + 1}`,
            districtName: "Kampar",
            count: 4,
            high: 1,
            shared: 0,
          })),
        },
      };
      const ys = imagePlacementYs(buildFireMapDoc(padat));
      expect(ys.length).toBeGreaterThan(0);
      expect(ys.every((y) => y > 0)).toBe(true);
    });

    it("laporan rentang live tetap tanpa seksi bulanan dan tetap 'Rentang Waktu'", () => {
      const text = pdfText(buildFireMapDoc({ ...base, rows: [row(1)] }));
      expect(text).toContain("Laporan Titik Api (Hotspot)");
      expect(text).toContain("Rentang Waktu: ");
      expect(text).not.toContain("Tren Harian");
      expect(text).toContain("jeda pembaruan data");
    });
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

describe("buildLayerReportDoc (lib/layer-report-pdf) — PDF per baris legenda Peta Lahan (#331)", () => {
  const D = 0.0009;
  it("poligon + titik: judul, subjudul, legenda, tabel multi-halaman, footer per halaman", () => {
    const rows = Array.from({ length: 80 }, (_, i) => ({ no: i + 1, id: `LHN-${i + 1}`, nkt: i % 7 === 0 ? "Terdampak NKT" : "Belum dinilai" }));
    const doc = buildLayerReportDoc({
      title: "Lahan terdampak NKT",
      subtitle: "ISH-1401-03 · 80 lahan · dicetak hari ini",
      fc: {
        type: "FeatureCollection",
        features: rows.map((r, i) => ({
          type: "Feature",
          geometry: i % 2 === 0
            ? { type: "Polygon", coordinates: [[[101 + i * D, 0.5], [101 + (i + 1) * D, 0.5], [101 + (i + 1) * D, 0.5 + D], [101 + i * D, 0.5 + D], [101 + i * D, 0.5]]] }
            : { type: "Point", coordinates: [101 + i * D, 0.5 + 2 * D] },
          properties: { nkt: r.nkt },
        })),
      },
      style: { colorOf: (p) => (p.nkt === "Terdampak NKT" ? [245, 158, 11] : [126, 34, 206]), numbered: true },
      legend: [{ color: [245, 158, 11], label: "Terdampak NKT" }],
      columns: [{ header: "No", key: "no", align: "right", width: 10 }, { header: "ID Lahan", key: "id" }, { header: "NKT", key: "nkt" }],
      rows,
    });
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(2);
    const text = pdfText(doc);
    expect(text).toContain("Lahan terdampak NKT");
    expect(text).toContain("ISH-1401-03");
    expect(text).toContain("LHN-80");
    expect(text).toContain("Hal. 1/");
  });

  it("landscape A4; fitur kecil berdempetan → halaman peta rinci per klaster bernomor (owner 2026-09-14), nomor tidak dicetak di atas 200 fitur", () => {
    // Dua blok terpisah 3 km, masing-masing 30 lahan 40 m × 40 m — di ikhtisar < 6 mm → dua halaman rinci A/B.
    const cell = 0.00036;
    const block = (ox: number, oy: number) =>
      Array.from({ length: 30 }, (_, i) => ({
        type: "Feature" as const,
        geometry: { type: "Polygon" as const, coordinates: [[[ox + (i % 6) * cell, oy + Math.floor(i / 6) * cell], [ox + (i % 6 + 1) * cell, oy + Math.floor(i / 6) * cell], [ox + (i % 6 + 1) * cell, oy + (Math.floor(i / 6) + 1) * cell], [ox + (i % 6) * cell, oy + (Math.floor(i / 6) + 1) * cell], [ox + (i % 6) * cell, oy + Math.floor(i / 6) * cell]]] },
        properties: {},
      }));
    const features = [...block(101.1, 0.5), ...block(101.13, 0.52)];
    const doc = buildLayerReportDoc({
      title: "Lahan NKT", subtitle: "uji klaster", fc: { type: "FeatureCollection", features },
      style: { color: [220, 38, 38], numbered: true },
      columns: [{ header: "No", key: "no" }], rows: features.map((_, i) => ({ no: i + 1 })),
    });
    expect(Math.round(doc.internal.pageSize.getWidth())).toBe(297);
    const text = pdfText(doc);
    expect(text).toContain("peta rinci A");
    expect(text).toContain("peta rinci B");
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(4);

    const many = Array.from({ length: 250 }, (_, i) => ({ type: "Feature" as const, geometry: { type: "Point" as const, coordinates: [101 + i * 0.001, 0.5] }, properties: {} }));
    const big = buildLayerReportDoc({ title: "Patok", subtitle: "uji", fc: { type: "FeatureCollection", features: many }, style: { numbered: true }, columns: [{ header: "No", key: "no" }], rows: [] });
    expect(pdfText(big)).toContain("Nomor tidak dicetak");
  });

  it("tanpa fitur → tetap terbit dengan keterangan peta kosong", () => {
    const doc = buildLayerReportDoc({ title: "Patok lahan", subtitle: "—", fc: { type: "FeatureCollection", features: [] }, columns: [{ header: "No", key: "no" }], rows: [] });
    expect(pdfText(doc)).toContain("Tidak ada fitur untuk digambar");
  });
});

describe("graticuleStep — interval kisi koordinat peta PDF (#331)", () => {
  it("memilih interval bulat supaya ≤ 7 garis pada bentang: 0,003° → 0,0005; 0,02° → 0,005; 0,3° → 0,05; 5° → 1", () => {
    expect(graticuleStep(0.003)).toBe(0.0005);
    expect(graticuleStep(0.02)).toBe(0.005);
    expect(graticuleStep(0.3)).toBe(0.05);
    expect(graticuleStep(5)).toBe(1);
  });
  it("label koordinat tercetak di tepi peta layer & Profil Lahan", () => {
    const D = 0.0009;
    const doc = buildLayerReportDoc({
      title: "Uji", subtitle: "-", columns: [{ header: "No", key: "no" }], rows: [],
      fc: { type: "FeatureCollection", features: [{ type: "Feature", geometry: { type: "Polygon", coordinates: [[[101.19, 0.52], [101.19 + D, 0.52], [101.19 + D, 0.52 + D], [101.19, 0.52 + D], [101.19, 0.52]]] }, properties: {} }] },
    });
    expect(pdfText(doc)).toMatch(/101\.19\d\d/);
  });
});
