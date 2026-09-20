import { describe, it, expect } from "vitest";
import {
  BMP_ASSESSMENT_CATEGORIES,
  bmpAssessmentCategory,
  cleanId,
  parseBmpImportRows,
  parseScore,
  parseSurveyDate,
  resolveBmpImportRows,
  roundScore,
  toUtcDay,
  fromUtcDay,
  formatUtcDate,
  isOutOfRubric,
  bmpAssessmentCategoryByKey,
  type BmpImportRawRow,
} from "@/lib/bmp-assessment";
import { bmpAssessmentSchema, bmpAssessmentImportSchema } from "@/validations/bmp-assessment.schema";

/**
 * Monev BMP (#344) — helper murni: rubrik kategori (batas ketat/inklusif
 * sesuai cara tim lapangan menerapkannya), parser tanggal 6 format rekap,
 * parser Excel header dua baris multi-tahun, dan resolusi pratinjau import.
 */

describe("bmpAssessmentCategory — rubrik rekap Rokan Hulu", () => {
  it("batas: Teladan KETAT > 2,50 (2,50 = Praktisi, seperti label tim lapangan ITM), lainnya inklusif", () => {
    const k = (s: number) => bmpAssessmentCategory(s).key;
    expect(k(3)).toBe("TELADAN");
    expect(k(2.53)).toBe("TELADAN");
    expect(k(2.51)).toBe("TELADAN");
    expect(k(2.5)).toBe("PRAKTISI");
    expect(k(2.49)).toBe("PRAKTISI");
    expect(k(1.5)).toBe("PRAKTISI");
    expect(k(1.49)).toBe("PERINTIS");
    expect(k(1.0)).toBe("PERINTIS");
    expect(k(0.99)).toBe("BELUM");
    expect(k(0)).toBe("BELUM");
  });

  it("artefak float dibulatkan dulu (1,4999999 → Praktisi, bukan Perintis)", () => {
    expect(bmpAssessmentCategory(1.4999999).key).toBe("PRAKTISI");
    expect(bmpAssessmentCategory(2.505).key).toBe("TELADAN");
  });

  it("konstanta urut tertinggi→terendah, ambang menurun, warna & label unik", () => {
    const mins = BMP_ASSESSMENT_CATEGORIES.map((c) => c.min);
    expect(mins).toEqual([...mins].sort((a, b) => b - a));
    expect(new Set(BMP_ASSESSMENT_CATEGORIES.map((c) => c.color)).size).toBe(4);
    expect(BMP_ASSESSMENT_CATEGORIES.map((c) => c.label)).toEqual(["Teladan", "Praktisi", "Perintis", "Belum Implementasi"]);
  });

  it("roundScore & parseScore: koma desimal diterima, teks bukan angka ditolak", () => {
    expect(roundScore(1.005)).toBe(1.01);
    expect(roundScore(1.8349)).toBe(1.83);
    expect(parseScore("1,83")).toBe(1.83);
    expect(parseScore(" 2.5 ")).toBe(2.5);
    expect(parseScore("c8")).toBeNull();
    expect(parseScore("")).toBeNull();
    expect(parseScore(77.6)).toBe(77.6);
  });
});

describe("parseSurveyDate — format kolom Tgl Survey rekap", () => {
  const iso = (d: Date | null) => d?.toISOString().slice(0, 10) ?? null;
  it("enam bentuk yang ada di berkas sumber + dd/mm/yyyy", () => {
    expect(iso(parseSurveyDate("26 Juni 26"))).toBe("2026-06-26");
    expect(iso(parseSurveyDate("25Juni 26"))).toBe("2026-06-25");
    expect(iso(parseSurveyDate("7 Juli 2026"))).toBe("2026-07-07");
    expect(iso(parseSurveyDate("20 Agustus 2026"))).toBe("2026-08-20");
    expect(iso(parseSurveyDate("2026-08-09"))).toBe("2026-08-09");
    expect(iso(parseSurveyDate(new Date("2026-11-07T00:00:00.000Z")))).toBe("2026-11-07");
    expect(iso(parseSurveyDate("08/07/2026"))).toBe("2026-07-08");
    expect(iso(parseSurveyDate("8-7-26"))).toBe("2026-07-08");
  });

  it("serial Excel, sel kosong, teks ngawur, tanggal tak valid", () => {
    expect(iso(parseSurveyDate(46204))).toBe("2026-07-01");
    expect(parseSurveyDate("")).toBeNull();
    expect(parseSurveyDate(null)).toBeNull();
    expect(parseSurveyDate("Agustus 24")).toBeNull();
    expect(parseSurveyDate("31 Februari 2026")).toBeNull();
    expect(parseSurveyDate("12 Bulanan 2026")).toBeNull();
  });

  it("sel Date dibaca dari KOMPONEN UTC-nya (kontrak exceljs: Date sel = UTC tengah malam) — bukan komponen lokal", () => {
    // exceljs memberi Date UTC tengah malam untuk sel tanggal → hari yang sama, waktu dibuang.
    expect(iso(parseSurveyDate(new Date("2026-07-08T00:00:00Z")))).toBe("2026-07-08");
    expect(iso(parseSurveyDate(new Date("2026-07-08T13:45:00Z")))).toBe("2026-07-08");
    // Konsekuensi yang disengaja & didokumentasikan: Date "tengah malam lokal" yang
    // dibuat di zona timur UTC (WIB = 17:00Z sehari sebelumnya) JATUH ke hari sebelumnya —
    // jalur form/kalender karena itu memakai `toUtcDay`, bukan `parseSurveyDate`.
    const wibMidnight = new Date("2026-07-07T17:00:00Z"); // = 8 Juli 00:00 WIB
    expect(iso(parseSurveyDate(wibMidnight))).toBe("2026-07-07");
    expect(iso(toUtcDay(new Date(2026, 6, 8)))).toBe("2026-07-08"); // kalender lokal → hari yang sama
  });
});

/** Rekap dua baris header: baris 1 tahun di sel merge (kiri-atas saja), baris 2 sub-kolom. */
const HEADER_ROWS: BmpImportRawRow[] = [
  { rowNumber: 1, values: ["No", "Nama Petani", "Id Petani", "Lokasi Kebun", "Blok", "Luas Lahan", 2025, null, null, 2026, null, null, 2027, null, null] },
  { rowNumber: 2, values: ["No", "Nama Petani", "Id Petani", "Lokasi Kebun", "Blok", "Luas Lahan", "Tgl Survey", "Skor", "Kriteria", "Tgl Survey", "Skor", "Kriteria", "Tgl Survey", "Skor", "Kriteria"] },
];

describe("parseBmpImportRows — rekap header dua baris multi-tahun", () => {
  it("satu baris × dua tahun berskor → dua penilaian; blok tahun kosong dilewati; Kriteria diabaikan", () => {
    const out = parseBmpImportRows([
      ...HEADER_ROWS,
      { rowNumber: 3, values: [1, "Damto", "SKPE.14.06.09.2001.0022", "SKPE.0022.A.14.06.09.2001", null, 1.82, "10 Juni 25", 1.2, "(Perintis)", "26 Juni 26", 1.83, "Praktisi", null, null, null] },
    ]);
    expect(out.years).toEqual([2025, 2026, 2027]);
    expect(out.headerRowNumber).toBe(1);
    expect(out.skipped).toEqual([]);
    expect(out.rows.map((r) => [r.surveyYear, r.score, r.surveyDate?.toISOString().slice(0, 10), r.parcelId])).toEqual([
      [2025, 1.2, "2025-06-10", "SKPE.0022.A.14.06.09.2001"],
      [2026, 1.83, "2026-06-26", "SKPE.0022.A.14.06.09.2001"],
    ]);
    expect(out.rows[0].farmerName).toBe("Damto");
  });

  it("Lokasi Kebun = Id Petani atau kosong → tanpa lahan; trailing titik ID dibuang", () => {
    const out = parseBmpImportRows([
      ...HEADER_ROWS,
      { rowNumber: 3, values: [1, "A", "SKPE.14.06.09.2001.0022", "SKPE.14.06.09.2001.0022", null, 1, null, null, null, "26 Juni 26", 1.83, null] },
      { rowNumber: 4, values: [2, "B", "RAS.14.06.09.2001.0012", "RAS.0012.A.14.06.09.2001.", null, 1, null, null, null, "25Juni 26", 1.46, null] },
      { rowNumber: 5, values: [3, "C", "SM.14.06.11.2001.0003 ", null, null, 1, null, null, null, "11 Juni 26", 1.52, null] },
    ]);
    expect(out.rows.map((r) => [r.farmerCode, r.parcelId])).toEqual([
      ["SKPE.14.06.09.2001.0022", null],
      ["RAS.14.06.09.2001.0012", "RAS.0012.A.14.06.09.2001"],
      ["SM.14.06.11.2001.0003", null],
    ]);
  });

  it("baris tanpa Id Petani dilewati & dilaporkan (blok baseline 2024 SSJ), baris kosong tidak dilaporkan", () => {
    const out = parseBmpImportRows([
      ...HEADER_ROWS,
      { rowNumber: 3, values: [1, "Aan Efendi", null, null, "15 Q", 2, "Agustus 24", 77.6, "x", null, null, null] },
      { rowNumber: 4, values: [null, null, null, null, null, null, null, null, null, null, null, null] },
      { rowNumber: 5, values: [1, "Aan Efendy", "SSJ.14.01.12.2007.0002", "SSJ.0002.A.14.01.12.2007", "13 T", 2, null, null, null, "7 Juli 2026", 2.23, "(Praktisi)"] },
    ]);
    expect(out.rows).toHaveLength(1);
    expect(out.rows[0].farmerCode).toBe("SSJ.14.01.12.2007.0002");
    expect(out.skipped).toEqual([{ rowNumber: 3, reason: "Tanpa ID Petani" }]);
  });

  it("skor bukan angka / di luar 0–3 → baris-tahun dilewati dengan alasan, bukan diam-diam", () => {
    const out = parseBmpImportRows([
      ...HEADER_ROWS,
      { rowNumber: 3, values: ["c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8", "c9", "c10", "c11", "c12"] },
      { rowNumber: 4, values: [2, "B", "X.1", null, null, 1, null, null, null, "7 Juli 2026", 77.6, null] },
    ]);
    expect(out.rows).toEqual([]);
    expect(out.skipped.map((s) => s.reason)).toEqual(['Skor 2025 tidak valid: "c8"', 'Skor 2026 tidak valid: "c11"', "Skor 2026 di luar 0–3: 77.6"]);
  });

  it("tanggal gagal parse → surveyDate null + surveyDateRaw terisi; tanggal masa depan tetap diparse (peringatan di resolver)", () => {
    const out = parseBmpImportRows([
      ...HEADER_ROWS,
      { rowNumber: 3, values: [1, "A", "X.1", null, null, 1, null, null, null, "Juni 26", 1.83, null] },
      { rowNumber: 4, values: [2, "B", "X.2", null, null, 1, null, null, null, "2026-11-07", 2.44, null] },
    ]);
    expect(out.rows[0].surveyDate).toBeNull();
    expect(out.rows[0].surveyDateRaw).toBe("Juni 26");
    expect(out.rows[1].surveyDate?.toISOString().slice(0, 10)).toBe("2026-11-07");
  });

  it("template satu baris header (2026 | Tgl Survey | Skor) juga dikenali", () => {
    const out = parseBmpImportRows([
      { rowNumber: 1, values: ["No", "Nama Petani", "Id Petani", "Lokasi Kebun", "2026", "Tgl Survey", "Skor"] },
      { rowNumber: 2, values: [1, "A", "X.1", "X.1.A", null, "26 Juni 2026", "1,83"] },
    ]);
    expect(out.years).toEqual([2026]);
    expect(out.rows).toHaveLength(1);
    expect(out.rows[0]).toMatchObject({ surveyYear: 2026, score: 1.83, parcelId: "X.1.A" });
  });

  it("sheet tanpa header tahun/Skor (mis. sheet Kategori) → kosong, headerRowNumber 0", () => {
    const out = parseBmpImportRows([
      { rowNumber: 1, values: ["Range Point", "Keterangan"] },
      { rowNumber: 2, values: ["> 2.50", "Teladan"] },
    ]);
    expect(out.rows).toEqual([]);
    expect(out.headerRowNumber).toBe(0);
  });

  it("cleanId: trim, satukan spasi, buang titik/spasi di ujung", () => {
    expect(cleanId(" ASPEK  RSB.0063.14.06.07.2013 . ")).toBe("ASPEK RSB.0063.14.06.07.2013");
    expect(cleanId(null)).toBe("");
  });
});

describe("resolveBmpImportRows — pratinjau: status, lahan, peringatan tanggal", () => {
  const refs = [
    { farmerCode: "X.1", farmerDbId: "f1", farmerName: "Ani (MIS)", parcels: [{ parcelId: "X.1.A", parcelUid: "uid-a" }], assessedYears: [2025] },
  ];
  const base = { rowNumber: 3, farmerCode: "X.1", farmerName: "Ani", parcelId: null as string | null, surveyYear: 2026, surveyDate: null as Date | null, surveyDateRaw: null as string | null, score: 1.83 };
  const now = new Date("2026-09-18T00:00:00.000Z");

  it("Baru vs Perbarui menurut tahun yang sudah dinilai; petani tak dikenal ditandai", () => {
    const out = resolveBmpImportRows(
      [base, { ...base, surveyYear: 2025 }, { ...base, farmerCode: "X.9" }],
      refs,
      now,
    );
    expect(out.map((r) => r.status)).toEqual(["CREATE", "UPDATE", "UNKNOWN_FARMER"]);
    expect(out[0].dbFarmerName).toBe("Ani (MIS)");
  });

  it("lahan dikenal → parcelUid; lahan tak dikenal → tanpa lahan + peringatan (baris tetap valid)", () => {
    const out = resolveBmpImportRows([{ ...base, parcelId: "X.1.A" }, { ...base, parcelId: "X.1.Z" }], refs, now);
    expect(out[0].parcelUid).toBe("uid-a");
    expect(out[0].warnings).toEqual([]);
    expect(out[1].parcelUid).toBeNull();
    expect(out[1].status).toBe("CREATE");
    expect(out[1].warnings[0]).toMatch(/tidak dikenal/);
  });

  it("'hari ini' pukul 06:30 WIB (UTC tengah malam > now) TIDAK dianggap masa depan; lusa tetap masa depan", () => {
    const now = new Date("2026-09-17T23:30:00.000Z"); // 18 Sep 06:30 WIB
    const out = resolveBmpImportRows(
      [
        { ...base, surveyDate: new Date("2026-09-18T00:00:00.000Z") },
        { ...base, surveyDate: new Date("2026-09-20T00:00:00.000Z") },
      ],
      refs,
      now,
    );
    expect(out[0].surveyDateToSave?.toISOString().slice(0, 10)).toBe("2026-09-18");
    expect(out[0].warnings).toEqual([]);
    expect(out[1].surveyDateToSave).toBeNull();
    expect(out[1].warnings[0]).toMatch(/masa depan/);
  });

  it("tanggal masa depan / beda tahun / tak terbaca → dikosongkan dengan peringatan, skor tetap masuk", () => {
    const out = resolveBmpImportRows(
      [
        { ...base, surveyDate: new Date("2026-11-07T00:00:00.000Z") },
        { ...base, surveyDate: new Date("2025-06-01T00:00:00.000Z") },
        { ...base, surveyDateRaw: "Juni 26" },
        { ...base, surveyDate: new Date("2026-06-26T00:00:00.000Z") },
      ],
      refs,
      now,
    );
    expect(out[0].surveyDateToSave).toBeNull();
    expect(out[0].warnings[0]).toMatch(/masa depan/);
    expect(out[1].surveyDateToSave).toBeNull();
    expect(out[1].warnings[0]).toMatch(/bukan tahun 2026/);
    expect(out[2].surveyDateToSave).toBeNull();
    expect(out[2].warnings[0]).toMatch(/tidak terbaca/);
    expect(out[3].surveyDateToSave?.toISOString().slice(0, 10)).toBe("2026-06-26");
    expect(out[3].warnings).toEqual([]);
  });
});

describe("Zod bmpAssessmentSchema", () => {
  it("skor dibulatkan 2 desimal; di luar 0–3 ditolak; tahun < 2020 atau > tahun depan ditolak", () => {
    const ok = bmpAssessmentSchema.safeParse({ farmerId: "f1", surveyYear: 2026, score: 1.8349 });
    expect(ok.success && ok.data.score).toBe(1.83);
    expect(bmpAssessmentSchema.safeParse({ farmerId: "f1", surveyYear: 2026, score: 3.01 }).success).toBe(false);
    expect(bmpAssessmentSchema.safeParse({ farmerId: "f1", surveyYear: 2019, score: 1 }).success).toBe(false);
    expect(bmpAssessmentSchema.safeParse({ farmerId: "f1", surveyYear: new Date().getUTCFullYear() + 2, score: 1 }).success).toBe(false);
  });

  it("tanggal hari ini (UTC tengah malam) diterima walau jam lokal WIB belum lewat 07:00", () => {
    const today = new Date();
    const utcMidnightToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    // Simulasi pukul 06:30 WIB = UTC-midnight hari ini + 0 → selalu ≤ now + 24 jam.
    const r = bmpAssessmentSchema.safeParse({ farmerId: "f1", surveyYear: utcMidnightToday.getUTCFullYear(), score: 1, surveyDate: utcMidnightToday });
    expect(r.success).toBe(true);
  });

  it("tanggal masa depan atau bukan tahun survei ditolak; teks kosong → null", () => {
    const future = new Date(Date.now() + 7 * 86_400_000);
    const r1 = bmpAssessmentSchema.safeParse({ farmerId: "f1", surveyYear: future.getUTCFullYear(), score: 1, surveyDate: future });
    expect(r1.success).toBe(false);
    const r2 = bmpAssessmentSchema.safeParse({ farmerId: "f1", surveyYear: 2026, score: 1, surveyDate: "2025-06-01" });
    expect(r2.success).toBe(false);
    const r3 = bmpAssessmentSchema.safeParse({ farmerId: "f1", surveyYear: 2026, score: 1, surveyDate: "2026-06-01", parcelUid: "  ", assessor: " ", notes: "" });
    expect(r3.success && r3.data).toMatchObject({ parcelUid: null, assessor: null, notes: null });
  });

  it("baris import memakai refine tanggal yang sama: masa depan / beda tahun ditolak di server", () => {
    const future = new Date(Date.now() + 7 * 86_400_000);
    const bad1 = bmpAssessmentImportSchema.safeParse({ farmerGroupId: "g1", rows: [{ rowNumber: 3, farmerCode: "X.1", parcelId: null, surveyYear: future.getUTCFullYear(), surveyDate: future, score: 1 }] });
    expect(bad1.success).toBe(false);
    const bad2 = bmpAssessmentImportSchema.safeParse({ farmerGroupId: "g1", rows: [{ rowNumber: 3, farmerCode: "X.1", parcelId: null, surveyYear: 2026, surveyDate: "2027-01-01", score: 1 }] });
    expect(bad2.success).toBe(false);
    const ok = bmpAssessmentImportSchema.safeParse({ farmerGroupId: "g1", rows: [{ rowNumber: 3, farmerCode: "X.1", parcelId: null, surveyYear: 2026, surveyDate: "2026-06-26", score: 1 }] });
    expect(ok.success).toBe(true);
  });

  it("batch import: minimal satu baris, maksimal 5.000, lembaga wajib", () => {
    expect(bmpAssessmentImportSchema.safeParse({ farmerGroupId: "", rows: [] }).success).toBe(false);
    const ok = bmpAssessmentImportSchema.safeParse({
      farmerGroupId: "g1",
      assessor: null,
      rows: [{ rowNumber: 3, farmerCode: "X.1", parcelId: null, surveyYear: 2026, surveyDate: null, score: "1.5" as unknown as number }],
    });
    // score bukan number → ditolak (tidak di-coerce diam-diam)
    expect(ok.success).toBe(false);
  });
});

describe("helper tanggal & rubrik bersama (review #347: satu sumber untuk 6 klien)", () => {
  it("formatUtcDate membaca komponen UTC (tidak mundur sehari di WIB), menerima string/Date, kosong & tak valid → placeholder", () => {
    expect(formatUtcDate(new Date("2026-09-20T00:00:00Z"))).toBe("20 Sep 2026");
    expect(formatUtcDate("2026-06-26T00:00:00.000Z")).toBe("26 Jun 2026");
    expect(formatUtcDate(null)).toBe("—");
    expect(formatUtcDate(undefined, "Pilih tanggal")).toBe("Pilih tanggal");
    expect(formatUtcDate("bukan tanggal")).toBe("—");
  });

  it("toUtcDay ↔ fromUtcDay bolak-balik mempertahankan tanggal kalender", () => {
    const local = new Date(2026, 8, 20, 15, 30); // 20 Sep 2026 sore lokal
    const utc = toUtcDay(local);
    expect(utc.toISOString()).toBe("2026-09-20T00:00:00.000Z");
    const back = fromUtcDay(utc);
    expect([back.getFullYear(), back.getMonth(), back.getDate(), back.getHours()]).toEqual([2026, 8, 20, 0]);
  });

  it("isOutOfRubric: 0–3 di dalam; 4/−1 di luar; null/undefined bukan", () => {
    expect([0, 1, 2, 3].map(isOutOfRubric)).toEqual([false, false, false, false]);
    expect([4, -1, 33].map(isOutOfRubric)).toEqual([true, true, true]);
    expect(isOutOfRubric(null)).toBe(false);
    expect(isOutOfRubric(undefined)).toBe(false);
  });

  it("bmpAssessmentCategoryByKey mengembalikan konstanta yang sama dengan bmpAssessmentCategory", () => {
    expect(bmpAssessmentCategoryByKey("TELADAN")).toBe(bmpAssessmentCategory(2.51));
    expect(bmpAssessmentCategoryByKey("BELUM").min).toBe(0);
  });
});
