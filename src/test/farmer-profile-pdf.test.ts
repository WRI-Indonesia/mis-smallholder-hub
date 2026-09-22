import { describe, it, expect } from "vitest";
import { buildFarmPassportDoc } from "@/lib/farm-passport";
import { assignParcelNumbers, buildFarmerProfileDoc, overviewMapFrame } from "@/lib/farmer-profile-pdf";
import type { ParcelPassport } from "@/types/map";
import type { FarmerProfileParcel, FarmerProfilePassport } from "@/types/farmer-profile";
import { pdfText } from "./pdf-text";

/**
 * PDF Profil Petani (#343): Bagian A ringkasan + Bagian B lampiran Profil
 * Lahan lewat `drawFarmPassport` — dokumen jsPDF asli diperiksa (halaman,
 * teks tercetak, tanpa throw), pola TD-019 `pdf-exporters.test.ts`.
 */

const D = 0.0009; // ≈ 100 m
const square = (lon: number, lat: number, d = D): ParcelPassport["parcel"]["geometry"] => ({
  type: "Polygon",
  coordinates: [[[lon, lat], [lon + d, lat], [lon + d, lat + d], [lon, lat + d], [lon, lat]]],
});

const parcel = (i: number, o: Partial<FarmerProfileParcel> = {}): FarmerProfileParcel => ({
  id: `lp-${i}`,
  parcelId: `SH-0001.${String.fromCharCode(64 + i)}`,
  subGroupLv2: "KT Karya Maju",
  blok: `Blok ${i}`,
  surat: i === 1 ? "SHM 727" : null,
  stdb: i === 1 ? "1637/53/1401/6/2025" : null,
  nktStatus: null,
  area: 2,
  plantingYear: 2016,
  isPsr: false,
  revision: 1,
  treeCount: 100 * i,
  markerCount: 4,
  geometry: square(101.5 + i * 0.002, 0.75),
  centroid: [101.5 + i * 0.002 + D / 2, 0.75 + D / 2],
  ...o,
});

const passportFor = (p: FarmerProfileParcel, totalKg = 0): ParcelPassport => ({
  farmer: { name: "Budi Santoso", code: "SH-0001", gender: "M", birthPlace: "Siak", birthDate: "1980-01-15", nik: "1408011501800001", address: "Kampung Uji", joinedYear: 2020 },
  group: { name: "Lembaga Uji", code: "ISH-1", districtName: "Siak", provinceName: "Riau" },
  parcel: {
    parcelId: p.parcelId, area: p.area, landStatus: "Owned", cropType: "Kelapa Sawit", plantingYear: p.plantingYear, notes: null,
    centroid: p.centroid!, geometry: p.geometry!, blok: p.blok, subGroupLv2: p.subGroupLv2, species: null, isPsr: p.isPsr,
    treeCount: p.treeCount, border: null, nkt: p.nktStatus ? { status: p.nktStatus, categories: ["NKT_4"], affectedAreaHa: null, affectedLengthM: null, assessedAt: null, assessor: null, source: null } : null,
  },
  legal: { documents: [], stdbs: [], externalIds: [], programs: [] },
  training: [{ code: "PAKET_1_BMP_PC_RSPO_NKT", label: "Paket 1 - BMP", completed: true, date: "2025-05-16" }],
  production: totalKg > 0
    ? { monthly: [totalKg, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], byYear: [{ year: 2025, monthly: [totalKg, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], total: totalKg }], totalKg, recordCount: 1 }
    : { monthly: Array(12).fill(0), byYear: [], totalKg: 0, recordCount: 0 },
  neighbors: [],
  neighborsOmitted: 0,
  markers: [],
});

/** Data petani lengkap: `parcels` diberikan, lampiran = lahan ber-geometri, produksi Σ 1.000 kg/lahan pada Jan 2025. */
function profile(parcels: FarmerProfileParcel[], o: Partial<FarmerProfilePassport> = {}): FarmerProfilePassport {
  const mapped = parcels.filter((p) => p.geometry);
  const totalArea = parcels.reduce((s, p) => s + (p.area ?? 0), 0);
  const kgPerParcel = 1000;
  const totalKg = kgPerParcel * parcels.length;
  return {
    farmer: {
      name: "Budi Santoso", code: "SH-0001", gender: "M", nik: "1408011501800001", birthPlace: "Siak", birthDate: "1980-01-15",
      address: "Kampung Uji", joinedYear: 2020, isActive: true, createdAt: "2025-01-01T00:00:00.000Z", modifiedAt: "2026-09-01T00:00:00.000Z",
    },
    group: { name: "Lembaga Uji", code: "ISH-1", districtName: "Siak", provinceName: "Riau" },
    subGroups: { kelompokTani: ["KT Karya Maju"] },
    summary: {
      totalParcels: parcels.length, totalArea, productionTotalKg: parcels.length ? totalKg : 0, productionYears: parcels.length ? [2025] : [],
      packagesDone: 1, packagesTotal: 4, profile: { complete: 5, total: 5, missing: [] },
      lastProductivity: parcels.length ? { year: 2025, tonHa: totalKg / 1000 / totalArea } : null,
    },
    parcels,
    training: {
      checklist: [
        { code: "PAKET_1_BMP_PC_RSPO_NKT", label: "BMP, P&C RSPO & NKT", done: true, participations: 2 },
        { code: "PAKET_2_MK", label: "Manajemen Kelompok", done: false, participations: 0 },
      ],
      history: [
        { id: "tp-1", packageCode: "PAKET_1_BMP_PC_RSPO_NKT", packageName: "BMP, P&C RSPO & NKT", trainingDate: "2025-05-16T00:00:00.000Z", location: "Balai Desa", preTestScore: 60, postTestScore: 85 },
        { id: "tp-2", packageCode: "PAKET_1_BMP_PC_RSPO_NKT", packageName: "BMP, P&C RSPO & NKT", trainingDate: "2024-03-10T00:00:00.000Z", location: null, preTestScore: null, postTestScore: null },
      ],
    },
    production: parcels.length
      ? {
          all: {
            perYear: [{
              year: 2025, totalKg, recordCount: parcels.length, reportedParcelMonths: parcels.length, parcelsReporting: parcels.length,
              areaReporting: totalArea, productivityTonHa: totalKg / 1000 / totalArea,
              months: [{ period: "2025-01", totalKg, parcelsReporting: parcels.length }],
            }],
            totalParcels: parcels.length,
            totalArea,
          },
          parcelBreakdown: parcels.map((p) => ({
            parcelKey: p.id, label: p.parcelId, area: p.area, isPsr: p.isPsr, plantingYear: p.plantingYear, excluded: false, year: 2025,
            months: { 1: { totalKg: kgPerParcel, recordCount: 1 } }, totalKg: kgPerParcel, recordCount: 1, productivityTonHa: p.area ? kgPerParcel / 1000 / p.area : 0,
          })),
          currentYear: 2026,
        }
      : { all: { perYear: [], totalParcels: 0, totalArea: 0 }, parcelBreakdown: [], currentYear: 2026 },
    parcelPassports: mapped.map((p) => passportFor(p, kgPerParcel)),
    includeParcels: true,
    bmp: null,
    ...o,
  };
}

describe("assignParcelNumbers — nomor peta = nomor tabel = nomor lampiran (#343)", () => {
  it("hanya lahan ber-geometri yang dinomori, urut daftar; tanpa geometri → null tanpa menggeser nomor berikutnya", () => {
    const nums = assignParcelNumbers([parcel(1), parcel(2, { geometry: null, centroid: null }), parcel(3)]);
    expect(nums).toEqual([1, null, 2]);
  });
  it("geometri ada tapi centroid gagal (null) diperlakukan sebagai belum dipetakan", () => {
    expect(assignParcelNumbers([parcel(1, { centroid: null })])).toEqual([null]);
  });
});

describe("overviewMapFrame — bingkai peta sebaran", () => {
  it("lahan tunggal ≈ 100 m → margin 100 m di tiap sisi (bukan 40 % seperti Profil Lahan)", () => {
    const f = overviewMapFrame([[101.5, 0.75], [101.5 + D, 0.75 + D]]);
    const m = 100 / 111_320;
    expect(f.minLat).toBeCloseTo(0.75 - m, 6);
    expect(f.maxLat).toBeCloseTo(0.75 + D + m, 6);
  });
  it("sebaran 26 km → margin 10 % span (≈ 2,6 km), bukan minimum 100 m", () => {
    const span = 26_000 / 111_320;
    const f = overviewMapFrame([[101.5, 0.75], [101.5 + span, 0.75]]);
    expect(f.maxLat - f.minLat).toBeCloseTo(2 * 0.1 * span * f.cosLat, 6);
  });
});

describe("buildFarmerProfileDoc — Bagian A + lampiran", () => {
  it("petani 3 lahan (1 tanpa geometri) → Bagian A + 2 lampiran; baris 'belum dipetakan'; No tabel = nomor lampiran", () => {
    const data = profile([parcel(1), parcel(2, { geometry: null, centroid: null }), parcel(3)]);
    const doc = buildFarmerProfileDoc(data);
    const text = pdfText(doc);
    expect(Math.round(doc.internal.pageSize.getWidth())).toBe(210);
    expect(text).toContain("PROFIL PETANI");
    expect(text).toContain("Budi Santoso");
    expect(text).toContain("Daftar Lahan (3)");
    expect(text).toContain("belum dipetakan");
    expect(text).toContain("1 lahan belum dipetakan");
    expect(text).toContain("Peta Sebaran Lahan");
    // Tanpa lahan NKT → keterangan "Merah = lahan NKT" tidak dicetak (owner 2026-09-22).
    expect(text).not.toContain("Merah = lahan NKT");
    // Lampiran: dua Profil Lahan penuh, bernomor 1 & 2 dari 2 — lahan B (tanpa geometri) tidak ikut.
    expect(text).toContain("Lampiran 1 dari 2");
    expect(text).toContain("Lampiran 2 dari 2");
    expect(text).not.toContain("Lampiran 3");
    expect((text.match(/PROFIL LAHAN/g) ?? []).length).toBe(2);
    // Lampiran TANPA section Pelatihan (owner 2026-09-22 — sudah terwakili Bagian A): "Paket Pelatihan" hanya ada di Profil Lahan berdiri sendiri.
    expect(text).not.toContain("Paket Pelatihan");
    expect(text).not.toContain("Tanggal Mengikuti");
    // Bagian A (≥ 1 hal) + 2 lampiran (≥ 1 hal masing-masing — tanpa Pelatihan, legalitas kosong muat 1 halaman).
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(3);
    // Footer di semua halaman & nomor menerus (n/N sama untuk seluruh dokumen).
    const total = doc.getNumberOfPages();
    for (let i = 1; i <= total; i++) expect(text).toContain(`Hal. ${i}/${total}`);
  });

  it("petani tanpa lahan → terbit tanpa peta & tanpa lampiran, tanpa throw; empty state lahan & produksi", () => {
    const doc = buildFarmerProfileDoc(profile([]));
    const text = pdfText(doc);
    expect(text).toContain("Petani ini belum memiliki lahan.");
    expect(text).not.toContain("Peta Sebaran Lahan");
    expect(text).not.toContain("Lampiran");
    expect(text).not.toContain("PROFIL LAHAN");
    expect(text).toContain("Belum ada data produksi untuk petani ini.");
    expect(text).toContain("Pelatihan");
    expect(doc.getNumberOfPages()).toBe(1);
  });

  it("includeParcels:false (Ringkasan saja) → hanya Bagian A walau lahan ber-geometri", () => {
    const data = profile([parcel(1), parcel(2)], { parcelPassports: [], includeParcels: false });
    const text = pdfText(buildFarmerProfileDoc(data));
    expect(text).toContain("Daftar Lahan (2)");
    expect(text).toContain("Peta Sebaran Lahan");
    expect(text).not.toContain("Lampiran");
    expect(text).not.toContain("PROFIL LAHAN");
  });

  it("matriks gabungan = Σ lahan (total kg & Luas Terdata); rekap per lahan = KELOMPOK per lahan (kepala: Luas · Umur/PSR · Σ kg · rata-rata Ton/Ha · n thn; lalu baris tahun)", () => {
    const data = profile([parcel(1), parcel(2, { isPsr: true, plantingYear: null }), parcel(3)], { parcelPassports: [], includeParcels: false });
    const text = pdfText(buildFarmerProfileDoc(data));
    expect(text).toContain("Total tercatat 3.000 kg");
    expect(text).toContain("Rekap per Lahan per Tahun");
    expect(text).toContain("Lahan / Tahun");
    expect(text).toContain("PSR");
    expect(text).toContain("10 thn"); // umur: currentYear 2026 − 2016
    expect(text).toContain("1 thn"); // jumlah tahun ber-data di baris kepala lahan
    expect(text).toContain("1/12");
    expect(text).toContain("Luas Terdata (Ha)");
    // ID lahan dicetak SEKALI di rekap (baris tahun di bawahnya tanpa ID) + sekali di Daftar Lahan.
    expect((text.match(/SH-0001\.A/g) ?? []).length).toBe(2);
  });

  it("rekap: 10 tahun ber-data tetap satu bentuk — tumbuh ke bawah (10 baris tahun di bawah kepala lahan), ID tak diulang, rata-rata Ton/Ha = Σ kg ÷ luas ÷ tahun", () => {
    const data = profile([parcel(1)], { parcelPassports: [], includeParcels: false });
    const base = data.production.parcelBreakdown[0]; // 1.000 kg, luas 2 ha → 0,50 Ton/Ha per tahun
    data.production.parcelBreakdown = Array.from({ length: 10 }, (_, i) => ({ ...base, year: 2026 - i }));
    const text = pdfText(buildFarmerProfileDoc(data));
    for (const yr of [2026, 2021, 2017]) expect(text).toContain(String(yr));
    expect(text).toContain("10 thn"); // jumlah tahun (umur lahan juga 10 thn — keduanya sah)
    expect(text).toContain("10.000"); // Σ kg di baris kepala
    expect((text.match(/SH-0001\.A/g) ?? []).length).toBe(2);
    expect(text).not.toContain("Bulan Terisi");
  });

  it("pelatihan = SATU tabel Paket | Tanggal | Pre / Post Test (owner 2026-09-22): tiap partisipasi satu baris urut paket wajib, paket belum diikuti → baris 'Belum'", () => {
    const text = pdfText(buildFarmerProfileDoc(profile([parcel(1)])));
    expect(text).toContain("Pre / Post Test");
    expect(text).not.toContain("Riwayat Partisipasi");
    expect(text).not.toContain("Paket Wajib");
    // Dua partisipasi Paket 1 → dua baris ber-tanggal; Manajemen Kelompok belum → "Belum".
    expect(text).toContain("16 Mei 2025");
    expect(text).toContain("10 Mar 2024");
    expect(text).toContain("60 / 85");
    expect(text).toContain("Manajemen Kelompok");
    expect(text).toContain("Belum");
    // Lokasi tidak dicetak (kolom dibuang).
    expect(text).not.toContain("Balai Desa");
  });

  it("riwayat kosong → paket wajib tetap tercetak sebagai baris 'Belum' (checklist tak hilang); tanpa checklist & riwayat → empty state", () => {
    const data = profile([parcel(1)], { training: { checklist: [{ code: "PAKET_2_MK", label: "Manajemen Kelompok", done: false, participations: 0 }], history: [] } });
    const text = pdfText(buildFarmerProfileDoc(data));
    expect(text).toContain("Manajemen Kelompok");
    expect(text).toContain("Belum");
    expect(text).not.toContain("Belum pernah mengikuti pelatihan.");
    const none = pdfText(buildFarmerProfileDoc(profile([parcel(1)], { training: { checklist: [], history: [] } })));
    expect(none).toContain("Belum pernah mengikuti pelatihan.");
  });

  it("partisipasi paket lain (OTHER, bukan paket wajib) ikut di bawah paket wajib", () => {
    const data = profile([parcel(1)]);
    data.training.history.push({ id: "tp-9", packageCode: "OTHER", packageName: "Sosialisasi Program", trainingDate: "2025-08-01T00:00:00.000Z", location: null, preTestScore: null, postTestScore: null });
    const text = pdfText(buildFarmerProfileDoc(data));
    expect(text).toContain("Sosialisasi Program");
    expect(text).toContain("01 Agu 2025");
  });

  it("NIK & tanggal lahir tercetak PENUH (dokumen resmi; layar disensor)", () => {
    const text = pdfText(buildFarmerProfileDoc(profile([parcel(1)])));
    expect(text).toContain("1408011501800001");
    expect(text).toContain("15 Jan 1980");
  });

  it("lahan tersebar 26 km + lahan NKT → penanda bernomor tetap tergambar, tidak throw", () => {
    const far = 26_000 / 111_320;
    const parcels = [parcel(1), parcel(2, { nktStatus: "AFFECTED" }), parcel(3, { geometry: square(101.5 + far, 0.75 + far), centroid: [101.5 + far + D / 2, 0.75 + far + D / 2] })];
    const doc = buildFarmerProfileDoc(profile(parcels));
    const text = pdfText(doc);
    // Kolom NKT tabel: "Terdampak" tanpa akhiran (kolom sudah berjudul NKT); badge lampiran tetap "Terdampak NKT".
    expect(text).toContain("Terdampak");
    expect(text).toContain("Terdampak NKT");
    expect(text).toContain("Merah = lahan NKT");
    expect(text).toContain("Lampiran 3 dari 3");
    // Skala batang di bingkai 26 km memakai kandidat km (#343) — tak lagi mentok di 1000 m.
    expect(text).toMatch(/\d+ km/);
  });

  it("40 lahan → dokumen besar tetap terbit (Bagian A pecah halaman, 40 lampiran, footer menerus)", () => {
    const parcels = Array.from({ length: 40 }, (_, i) => parcel(i + 1, { parcelId: `SH-0001.${i + 1}`, geometry: square(101.5 + (i % 8) * 0.002, 0.75 + Math.floor(i / 8) * 0.002), centroid: [101.5 + (i % 8) * 0.002 + D / 2, 0.75 + Math.floor(i / 8) * 0.002 + D / 2] }));
    const doc = buildFarmerProfileDoc(profile(parcels));
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(41);
    const text = pdfText(doc);
    expect(text).toContain("Lampiran 40 dari 40");
    expect(text).toContain(`Hal. ${doc.getNumberOfPages()}/${doc.getNumberOfPages()}`);
  });

  const bmpAssessment = (year: number, score: number, withActivities = true) => ({
    id: `bmp-${year}`, surveyYear: year, surveyDate: `${year}-07-11T00:00:00.000Z`, score, parcelId: "SH-0001.A", assessor: "Tim ICS", notes: year === 2026 ? "kebun rapi" : null,
    activities: withActivities
      ? [
          { code: "1.1", name: "Knowledge (Petani dan Pekerja)", score: 2.3, max: 3, filled: 1, total: 1 },
          { code: "1.2", name: "Pemupukan", score: 2.2, max: 3, filled: 4, total: 4 },
          { code: "1.3", name: "Pengendalian Gulma", score: 3, max: 3, filled: 3, total: 4 },
          { code: "1.4", name: "Pengendalian Hama Penyakit Terpadu (PHPT)", score: 2.3, max: 3, filled: 5, total: 5 },
          { code: "1.5", name: "Panen", score: 2.85, max: 3, filled: 4, total: 4 },
        ]
      : [],
    groupFilled: 13, groupTotal: 14,
  });

  it("Monev BMP (owner 2026-09-22): tanpa izin (bmp null) → tidak ada section & badge; ada izin tanpa penilaian → empty state", () => {
    const none = pdfText(buildFarmerProfileDoc(profile([parcel(1)])));
    expect(none).not.toContain("Monev BMP");
    expect(none).not.toContain("Teladan");
    const empty = pdfText(buildFarmerProfileDoc(profile([parcel(1)], { bmp: { assessments: [] } })));
    expect(empty).toContain("Monev BMP");
    expect(empty).toContain("Belum ada penilaian Monev BMP untuk petani ini.");
  });

  it("Monev BMP: badge kategori terbaru di header, tabel per tahun ber-kolom 5 kegiatan (nama pendek), radar + rincian tahun terbaru, dicetak juga saat produksi kosong", () => {
    const data = profile([parcel(1)], { bmp: { assessments: [bmpAssessment(2026, 2.53), bmpAssessment(2025, 1.2, false)] } });
    const text = pdfText(buildFarmerProfileDoc(data));
    expect(text).toContain("Teladan"); // badge header + kolom Kategori
    expect(text).toContain("Perintis"); // 2025 = 1,20
    expect(text).toContain("11 Jul 2026");
    expect(text).toContain("Tim ICS");
    for (const h of ["Knowledge", "Pemupukan", "Gulma", "PHPT", "Panen"]) expect(text).toContain(h);
    expect(text).toContain("Rincian 2026");
    expect(text).toContain("1.4 Pengendalian Hama Penyakit Terpadu (PHPT)");
    expect(text).toContain("3/4 terisi");
    expect(text).toContain("terisi 13/14");
    expect(text).toContain("kebun rapi");
    // Produksi kosong tidak memutus alur ke section Monev BMP.
    const noProd = profile([], { bmp: { assessments: [bmpAssessment(2026, 2.53)] } });
    expect(pdfText(buildFarmerProfileDoc(noProd))).toContain("Rincian 2026");
  });

  it("metadata PDF terisi (title/subject/author) untuk Profil Petani & Profil Lahan", () => {
    const data = profile([parcel(1)]);
    const petani = buildFarmerProfileDoc(data).output("arraybuffer");
    const s = Buffer.from(petani).toString("latin1");
    expect(s).toContain("/Title (Profil Petani SH-0001 - Budi Santoso)");
    expect(s).toContain("/Author (Smallholder HUB)");
    const lahan = Buffer.from(buildFarmPassportDoc(data.parcelPassports[0]).output("arraybuffer")).toString("latin1");
    expect(lahan).toContain("/Title (Profil Lahan SH-0001.A)");
    expect(lahan).toContain("/Author (Smallholder HUB)");
  });

  it("regresi: Profil Lahan berdiri sendiri tetap 2 halaman, masih ber-section Pelatihan, tanpa baris 'Lampiran' setelah refactor drawFarmPassport", () => {
    const doc = buildFarmPassportDoc(profile([parcel(1)]).parcelPassports[0]);
    expect(doc.getNumberOfPages()).toBe(2);
    const text = pdfText(doc);
    expect(text).not.toContain("Lampiran");
    expect(text).toContain("Paket Pelatihan");
  });
});
