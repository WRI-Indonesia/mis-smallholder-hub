import { describe, it, expect } from "vitest";
import {
  bmpActivityMaxScore,
  bmpScoreLabel,
  farmerNameFromFileName,
  levenshtein,
  matchFarmerName,
  namesAgree,
  parseBmpSurveyForm,
  recomputeBmpScore,
  type BmpIndicatorRef,
} from "@/lib/bmp-survey-form";
import type { RawSheetRow } from "@/lib/excel-sheet-reader";

/**
 * Parser form survei Monev BMP (#346): header ber-merge, skor dari sheet
 * Lembaga/Individu (bukan formula Gabungan), pemetaan indikator lewat
 * kriteria+teks dengan fallback urutan, nama dari nama berkas, hitung ulang.
 */

const ind = (o: Partial<BmpIndicatorRef> & Pick<BmpIndicatorRef, "id" | "code" | "level" | "name" | "criteriaCode" | "sortOrder">): BmpIndicatorRef => ({
  activityCode: o.code.slice(0, 3),
  activityName: { "1.1": "Training", "1.2": "Pemupukan", "1.3": "Gulma", "1.4": "PHPT", "1.5": "Panen" }[o.code.slice(0, 3)] ?? "?",
  activityWeight: { "1.1": 0.1, "1.2": 0.35, "1.3": 0.1, "1.4": 0.1, "1.5": 0.35 }[o.code.slice(0, 3)] ?? 0,
  criteriaName: "",
  seq: Number(o.code.split(".")[3]),
  weight: null,
  inFinalScore: false,
  scoreLabel0: null,
  scoreLabel1: null,
  scoreLabel2: null,
  scoreLabel3: null,
  ...o,
});

/** Subset master yang cukup untuk menguji rumus: 2 Training + 2 Pemupukan + 1 Panen lembaga. */
const INDICATORS: BmpIndicatorRef[] = [
  ind({ id: "i1", code: "1.1.1.1", level: "INDIVIDU", criteriaCode: "1.1.1", name: "Sudah mendapatkan pelatihan", weight: 0.3, inFinalScore: true, sortOrder: 10, scoreLabel0: "Belum Training", scoreLabel3: "Sudah Implementasi" }),
  ind({ id: "l1", code: "1.1.1.2", level: "LEMBAGA", criteriaCode: "1.1.1", name: "Memiliki standard teknis kerja", weight: 0.7, inFinalScore: true, sortOrder: 20 }),
  ind({ id: "l2", code: "1.2.1.1", level: "LEMBAGA", criteriaCode: "1.2.1", name: "Tersedia 1 Unit Managemen Perawatan", weight: null, inFinalScore: false, sortOrder: 30 }),
  ind({ id: "i2", code: "1.2.3.1", level: "INDIVIDU", criteriaCode: "1.2.3", name: "Menerapkan metode 5 T", weight: 0.35, inFinalScore: true, sortOrder: 40 }),
  ind({ id: "i3", code: "1.2.3.2", level: "INDIVIDU", criteriaCode: "1.2.3", name: "Menggunaan bahan organik", weight: 0.15, inFinalScore: true, sortOrder: 50 }),
  ind({ id: "l3", code: "1.5.1.7", level: "LEMBAGA", criteriaCode: "1.5.1", name: "Transportasi", weight: 0.05, inFinalScore: true, sortOrder: 60 }),
];

const row = (n: number, values: unknown[]): RawSheetRow => ({ rowNumber: n, values: values as RawSheetRow["values"] });

function sheets(opts: { periode?: unknown; petani?: string; total?: number; ind?: (unknown[])[]; lem?: (unknown[])[] } = {}) {
  return [
    {
      name: "Form Penilaian (Gabungan)",
      rows: [
        row(7, ["Nama Lembaga :", "Nama Lembaga :", null, "KPUD Intan Makmur", null, null, "Nama Petani :", null, opts.petani ?? "Budi Santoso"]),
        row(8, ["Periode :", "Periode :", null, opts.periode ?? "11 Juli 2026", null, null, "Lokasi Kebun :", null, "K 16"]),
        row(9, [null, null, null, null, null, null, "Luasan (Ha) :", null, 2]),
        row(10, [null, null, null, null, null, null, "Hasil Penilaian :", null, "2.29 (Praktisi)"]),
        row(13, ["Kode", "Kegiatan", "Kode", "Kriteria", null, "Lembaga", "Individu", "Skor", "Catatan", "Bobot", "Skor Indikator", null, "No", "Kriteria", "Bobot", "Skor Indikator", "Nilai Akhir"]),
        row(19, ["1.2", "Pemupukan", "1.2.3", "x", 1, null, "y", 2, null, 0.35, 0.7, null, "Total", "Total", "Total", "Total", opts.total ?? 2.2875]),
      ],
    },
    {
      name: "Form Survey Lembaga",
      rows: [
        row(10, ["Kode", "Kegiatan", "Kode", "Kriteria", "Lembaga", "Skor", "Catatan"]),
        ...(opts.lem ?? [
          ["1.1", "Training", "1.1.1", "Petani…", "Memiliki standard teknis kerja", 2, null],
          ["1.2", "Pemupukan", "1.2.1", "Unit", "Tersedia 1 Unit Managemen Perawatan / Lembaga", 3, null],
          ["1.5", "Panen", "1.5.1", "Management Panen", "Transportasi", 3, null],
        ]).map((v, i) => row(11 + i, v)),
      ],
    },
    {
      name: "Form Survey Individu",
      rows: [
        row(12, ["Kode", "Kegiatan", "Kode", "Kriteria", "Individu", "Skor", "Catatan"]),
        ...(opts.ind ?? [
          ["1.1", "Training", "1.1.1", "Petani…", "Sudah mendapatkan pelatihan sehingga…", 2, null],
          ["1.2", "Pemupukan", "1.2.3", "Penerapan", "Menerapkan metode 5 T (Tepat Waktu…)", 2, null],
          ["1.2", "Pemupukan", "1.2.3", "Penerapan", "Menggunaan bahan organik (Pupuk organik…)", 2, "Jangkos Pupuk Kandang"],
        ]).map((v, i) => row(13 + i, v)),
      ],
    },
    { name: "Panduan ", rows: [] },
  ];
}

describe("farmerNameFromFileName — nama petani dari nama berkas (identitas utama)", () => {
  it("empat pola nama berkas tim lapangan + akhiran (1)", () => {
    expect(farmerNameFromFileName("Monev- 2026 - IM_Budi Santoso.xlsx")).toBe("Budi Santoso");
    expect(farmerNameFromFileName("Form Baseline Impact BMP - 2026 - Sari Lestari.xlsx")).toBe("Sari Lestari");
    expect(farmerNameFromFileName("Monev 2026 - KPUD Tujuh Permata_ Sofyan Hadi.xlsx")).toBe("Sofyan Hadi");
    expect(farmerNameFromFileName("Monev- 2026 - ASPEK RAS_Eddi Martuah Nasution(1).xlsx")).toBe("Eddi Martuah Nasution");
    expect(farmerNameFromFileName("FPSSSMBMP - 2026 - Hendri.xlsx")).toBe("Hendri");
    expect(farmerNameFromFileName("folder/Monev  2026 - ASPEK KRE_ Aen Karnila.xlsx")).toBe("Aen Karnila");
  });
});

describe("parseBmpSurveyForm", () => {
  it("header ber-merge (label terulang) terbaca; skor dari sheet Lembaga/Individu; total raport; catatan", () => {
    const p = parseBmpSurveyForm("Monev- 2026 - IM_Budi Santoso.xlsx", sheets(), INDICATORS);
    expect(p.groupName).toBe("KPUD Intan Makmur");
    expect(p.headerFarmerName).toBe("Budi Santoso");
    expect(p.fileFarmerName).toBe("Budi Santoso");
    expect(p.surveyDate?.toISOString().slice(0, 10)).toBe("2026-07-11");
    expect(p.location).toBe("K 16");
    expect(p.areaHa).toBe(2);
    expect(p.resultText).toBe("2.29 (Praktisi)");
    expect(p.totalScore).toBe(2.29);
    expect(p.lembaga.map((x) => [x.code, x.score])).toEqual([["1.1.1.2", 2], ["1.2.1.1", 3], ["1.5.1.7", 3]]);
    expect(p.individu.map((x) => [x.code, x.score, x.notes])).toEqual([["1.1.1.1", 2, null], ["1.2.3.1", 2, null], ["1.2.3.2", 2, "Jangkos Pupuk Kandang"]]);
    expect(p.warnings).toEqual([]);
  });

  it("header ≠ nama berkas → peringatan, nama berkas tetap identitas; periode 'Juni 2026' → tanggal null + peringatan; total dari Hasil bila raport kosong", () => {
    const p = parseBmpSurveyForm("Form Baseline Impact BMP - 2026 - Arisman.xlsx", sheets({ petani: "Adriyanus", periode: "Juni 2026", total: undefined }), INDICATORS);
    expect(p.fileFarmerName).toBe("Arisman");
    expect(p.headerFarmerName).toBe("Adriyanus");
    expect(p.warnings.some((w) => w.startsWith("Nama di header"))).toBe(true);
    expect(p.surveyDate).toBeNull();
    expect(p.warnings.some((w) => w.includes("Periode"))).toBe(true);
    expect(p.totalScore).toBe(2.29);
  });

  it("sel kosong → null; skor 4 diterima + peringatan; teks bukan angka → kosong + peringatan; teks beda kata jatuh ke urutan dalam kriteria", () => {
    const p = parseBmpSurveyForm(
      "x - 2026 - A.xlsx",
      sheets({
        ind: [
          ["1.1", "Training", "1.1.1", "k", "Knowledge dan Capacity Building", null, null], // teks Panduan ≠ master → fallback urutan
          ["1.2", "Pemupukan", "1.2.3", "k", "Melaksanakan metode 5 T", 4, null],
          ["1.2", "Pemupukan", "1.2.3", "k", "Penggunaan bahan organik", "x", null],
        ],
      }),
      INDICATORS,
    );
    expect(p.individu.map((x) => [x.code, x.score])).toEqual([["1.1.1.1", null], ["1.2.3.1", 4], ["1.2.3.2", null]]);
    expect(p.warnings.some((w) => w.includes("di luar rubrik"))).toBe(true);
    expect(p.warnings.some((w) => w.includes("bukan angka"))).toBe(true);
  });

  it("indikator master yang tak ada di sheet dilaporkan; sheet hilang dilaporkan", () => {
    const p = parseBmpSurveyForm("x - 2026 - A.xlsx", sheets({ ind: [["1.1", "Training", "1.1.1", "k", "Sudah mendapatkan pelatihan", 1, null]] }).filter((s) => s.name !== "Form Survey Lembaga"), INDICATORS);
    expect(p.lembaga).toEqual([]);
    expect(p.warnings.some((w) => w.includes("Form Survey Lembaga tidak ditemukan"))).toBe(true);
    expect(p.warnings.some((w) => w.includes("2 indikator individu tidak ada di sheet"))).toBe(true);
  });
});

describe("recomputeBmpScore — rumus form (Σ bobot kegiatan × Σ bobot indikator × skor, kosong = 0)", () => {
  it("cocok dengan contoh satu form pada subset: Training (2×0,3 + 2×0,7)×0,1 + Pemupukan (2×0,35+2×0,15)×0,35 + Panen 3×0,05×0,35", () => {
    const rc = recomputeBmpScore(INDICATORS, new Map([["1.1.1.1", 2], ["1.2.3.1", 2], ["1.2.3.2", 2]]), new Map([["1.1.1.2", 2], ["1.2.1.1", 3], ["1.5.1.7", 3]]));
    const byCode = Object.fromEntries(rc.activities.map((a) => [a.activityCode, a]));
    expect(byCode["1.1"].indicatorScore).toBe(2);
    expect(byCode["1.1"].contribution).toBe(0.2);
    expect(byCode["1.2"].indicatorScore).toBe(1);
    expect(byCode["1.2"].contribution).toBe(0.35);
    expect(byCode["1.5"].indicatorScore).toBe(0.15);
    expect(rc.total).toBe(0.6); // 0.2 + 0.35 + 0.0525 → 0.6025 → 0.60
  });

  it("indikator kosong dihitung 0 dan dicatat di missingWeighted; informatif tak berpengaruh; skor 4 ikut apa adanya", () => {
    const rc = recomputeBmpScore(INDICATORS, new Map([["1.1.1.1", null], ["1.2.3.1", 4]]), new Map([["1.2.1.1", 3]]));
    const byCode = Object.fromEntries(rc.activities.map((a) => [a.activityCode, a]));
    expect(byCode["1.1"].missingWeighted).toBe(2); // 1.1.1.1 null + 1.1.1.2 lembaga tak ada
    expect(byCode["1.2"].indicatorScore).toBe(1.4); // 4 × 0.35, bahan organik kosong
    expect(byCode["1.2"].missingWeighted).toBe(1);
    expect(byCode["1.5"].indicatorScore).toBe(0);
    expect(rc.total).toBe(0.49);
  });

  it("kriteria alternatif 1.3.2 (petani ATAU pekerja): skor tertinggi yang terisi × 0,2, bobot dihitung sekali; kosong keduanya = 1 indikator kosong", () => {
    const gulma: BmpIndicatorRef[] = [
      ind({ id: "g1", code: "1.3.2.1", level: "INDIVIDU", criteriaCode: "1.3.2", name: "Petani memahami jenis gulma", weight: 0.2, inFinalScore: true, sortOrder: 70, activityCode: "1.3", activityName: "Pengendalian Gulma", activityWeight: 0.1 }),
      ind({ id: "g2", code: "1.3.2.2", level: "INDIVIDU", criteriaCode: "1.3.2", name: "Pekerja memahami jenis gulma", weight: 0.2, inFinalScore: true, sortOrder: 80, activityCode: "1.3", activityName: "Pengendalian Gulma", activityWeight: 0.1 }),
      ind({ id: "g3", code: "1.3.3.1", level: "INDIVIDU", criteriaCode: "1.3.3", name: "Aplikasi chemical", weight: 0.6, inFinalScore: true, sortOrder: 90, activityCode: "1.3", activityName: "Pengendalian Gulma", activityWeight: 0.1 }),
      ind({ id: "g4", code: "1.3.3.2", level: "INDIVIDU", criteriaCode: "1.3.3", name: "Siklus 3 rotasi", weight: 0.2, inFinalScore: true, sortOrder: 100, activityCode: "1.3", activityName: "Pengendalian Gulma", activityWeight: 0.1 }),
    ];
    expect(bmpActivityMaxScore(gulma, "1.3")).toBe(3); // bukan 3,6
    const act = (m: Map<string, number | null>) => recomputeBmpScore(gulma, m, new Map()).activities[0];
    // Hanya petani (pola lapangan): 3×0,2 + 3×0,6 + 3×0,2 = 3,00
    expect(act(new Map([["1.3.2.1", 3], ["1.3.2.2", null], ["1.3.3.1", 3], ["1.3.3.2", 3]]))).toMatchObject({ indicatorScore: 3, contribution: 0.3, missingWeighted: 0 });
    // Keduanya terisi (13 form Rohul): dipakai yang tertinggi, bukan dijumlah (rumus form memberi 3,6)
    expect(act(new Map([["1.3.2.1", 2], ["1.3.2.2", 3], ["1.3.3.1", 3], ["1.3.3.2", 3]]))).toMatchObject({ indicatorScore: 3, missingWeighted: 0 });
    expect(act(new Map([["1.3.2.1", 2], ["1.3.2.2", 2], ["1.3.3.1", 3], ["1.3.3.2", 3]]))).toMatchObject({ indicatorScore: 2.8 });
    // Keduanya kosong: satu slot kosong (bukan dua)
    expect(act(new Map([["1.3.3.1", 3], ["1.3.3.2", 3]]))).toMatchObject({ indicatorScore: 2.4, missingWeighted: 1 });
  });

  it("bmpScoreLabel: label rubrik per skor, null bila tak didefinisikan / di luar 0–3", () => {
    expect(bmpScoreLabel(INDICATORS[0], 0)).toBe("Belum Training");
    expect(bmpScoreLabel(INDICATORS[0], 3)).toBe("Sudah Implementasi");
    expect(bmpScoreLabel(INDICATORS[0], 1)).toBeNull();
    expect(bmpScoreLabel(INDICATORS[0], 4)).toBeNull();
    expect(bmpScoreLabel(INDICATORS[0], null)).toBeNull();
  });
});

describe("pencocokan nama petani", () => {
  const farmers = [
    { farmerDbId: "a", name: "Rusdi", farmerCode: "KRE.1" },
    { farmerDbId: "b", name: "Mardiah Susanti", farmerCode: "KRE.2" },
    { farmerDbId: "c", name: "Tono Hardiyanto", farmerCode: "KRE.6" },
    { farmerDbId: "d", name: "Agus Setiawan", farmerCode: "TJP.20" },
    { farmerDbId: "e", name: "Hendra Wijaya", farmerCode: "SKPE.5" },
    { farmerDbId: "f", name: "Hendra Gunawan", farmerCode: "SKPE.8" },
    { farmerDbId: "g", name: "Sri wahyuni", farmerCode: "KRE.37" },
  ];

  it("levenshtein & namesAgree", () => {
    expect(levenshtein("rusdhi", "rusdi")).toBe(1);
    expect(namesAgree("Sri Wahyuni", "Sri wahyuni")).toBe(true);
    expect(namesAgree("Rahmat Hidayat", "Nurhayati")).toBe(false);
    expect(namesAgree("Agus Setiadi", "Agus Setiawan")).toBe(true); // awalan 6 huruf sama
  });

  it("EXACT (kunci huruf sama, abaikan kapital/spasi), FUZZY typo ≤ 2, AMBIGUOUS token depan ganda, NONE", () => {
    expect(matchFarmerName("Sri Wahyuni", farmers)).toMatchObject({ farmerDbId: "g", confidence: "EXACT" });
    expect(matchFarmerName("Rusdhi", farmers)).toMatchObject({ farmerDbId: "a", confidence: "FUZZY" });
    expect(matchFarmerName("Tono Hardiyanta", farmers)).toMatchObject({ farmerDbId: "c", confidence: "FUZZY" });
    expect(matchFarmerName("Hendra Widjaya", farmers)).toMatchObject({ farmerDbId: "e", confidence: "FUZZY" });
    expect(matchFarmerName("Mardiyah", farmers)).toMatchObject({ farmerDbId: "b", confidence: "FUZZY" }); // token depan beda 1 huruf
    expect(matchFarmerName("Hendra", farmers)).toMatchObject({ farmerDbId: null, confidence: "AMBIGUOUS" }); // dua Hendra
  });

  it("nama kembar dalam satu Lembaga: kandidat yang sudah punya skor tahun itu (rekap #344) dipilih sebagai FUZZY; tanpa preferensi → AMBIGUOUS", () => {
    const twins = [...farmers, { farmerDbId: "w1", name: "Suparman", farmerCode: "RAS.10" }, { farmerDbId: "w2", name: "Suparman", farmerCode: "RAS.99" }];
    expect(matchFarmerName("Suparman", twins)).toMatchObject({ farmerDbId: null, confidence: "AMBIGUOUS" });
    expect(matchFarmerName("Suparman", twins, { preferIds: new Set(["w2"]) })).toMatchObject({ farmerDbId: "w2", confidence: "FUZZY" });
    expect(matchFarmerName("Suparman", twins, { preferIds: new Set(["w1", "w2"]) })).toMatchObject({ farmerDbId: null, confidence: "AMBIGUOUS" });
    expect(matchFarmerName("Zulkifli Nasution", farmers)).toMatchObject({ farmerDbId: null, confidence: "NONE" });
    expect(matchFarmerName(null, farmers)).toMatchObject({ farmerDbId: null, confidence: "NONE" });
  });
});
