import { z } from "zod";
import { BMP_SCORE_MAX, BMP_SCORE_MIN, BMP_SURVEY_YEAR_MIN, roundScore } from "@/lib/bmp-assessment";

/** Batas atas tahun survei: tahun berjalan + 1 (rekap sudah menyiapkan kolom tahun depan). */
const maxSurveyYear = () => new Date().getUTCFullYear() + 1;

const surveyYearField = z
  .number({ message: "Tahun survei harus berupa angka" })
  .int("Tahun survei harus bilangan bulat")
  .min(BMP_SURVEY_YEAR_MIN, `Tahun survei minimal ${BMP_SURVEY_YEAR_MIN}`)
  .refine((y) => y <= maxSurveyYear(), { message: "Tahun survei melampaui tahun depan" });

const scoreField = z
  .number({ message: "Skor harus berupa angka" })
  .min(BMP_SCORE_MIN, `Skor minimal ${BMP_SCORE_MIN}`)
  .max(BMP_SCORE_MAX, `Skor maksimal ${BMP_SCORE_MAX}`)
  .transform(roundScore);

const surveyDateField = z.coerce
  .date({ message: "Tanggal survei tidak valid" })
  .nullable()
  .optional();

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} maksimal ${max} karakter`)
    .transform((s) => (s === "" ? null : s))
    .nullable()
    .optional();

/**
 * Satu penilaian Monev BMP (#344). `surveyDate` bila diisi harus jatuh pada
 * `surveyYear` dan tidak di masa depan — tanggal masa depan pada rekap (ITM
 * `2026-11-07`) adalah salah ketik, bukan data.
 */
const assessmentFields = {
  farmerId: z.string().min(1, "Petani wajib dipilih"),
  surveyYear: surveyYearField,
  surveyDate: surveyDateField,
  score: scoreField,
  /** Identitas lahan (`parcelUid`) yang dikunjungi; harus milik petani yang sama (dicek action). */
  parcelUid: z
    .string()
    .transform((s) => (s.trim() === "" ? null : s.trim()))
    .nullable()
    .optional(),
  assessor: optionalText(120, "Nama penilai"),
  notes: optionalText(2000, "Catatan"),
};

/**
 * Tanggal disimpan sebagai UTC tengah malam, sedangkan pengguna di WIB/WITA/WIT
 * (+7..+9 jam): "hari ini" yang dipilih pukul 06:30 WIB = 2026-09-20T00:00Z >
 * `Date.now()`. Toleransi 24 jam (pola `land-marker.schema.ts`) agar hari ini
 * selalu sah; tanggal lusa tetap ditolak.
 */
export const SURVEY_DATE_FUTURE_TOLERANCE_MS = 24 * 3600 * 1000;

function refineAssessment(v: { surveyYear: number; surveyDate?: Date | null }, ctx: z.RefinementCtx) {
  if (!v.surveyDate) return;
  if (v.surveyDate.getTime() > Date.now() + SURVEY_DATE_FUTURE_TOLERANCE_MS) {
    ctx.addIssue({ code: "custom", path: ["surveyDate"], message: "Tanggal survei tidak boleh di masa depan" });
  }
  if (v.surveyDate.getUTCFullYear() !== v.surveyYear) {
    ctx.addIssue({ code: "custom", path: ["surveyDate"], message: "Tanggal survei harus berada di tahun survei" });
  }
}

export const bmpAssessmentSchema = z.object(assessmentFields).superRefine(refineAssessment);

export type BmpAssessmentInput = z.input<typeof bmpAssessmentSchema>;

export const updateBmpAssessmentSchema = z
  .object({ id: z.string().min(1, "ID penilaian wajib ada"), ...assessmentFields })
  .superRefine(refineAssessment);

export type UpdateBmpAssessmentInput = z.input<typeof updateBmpAssessmentSchema>;

/**
 * Batch import (hasil pratinjau klien). Petani/lahan dirujuk lewat KODE
 * (ID Petani per Lembaga, ID Lahan) — server yang meresolusi ke CUID dalam
 * scope, klien tidak dipercaya mengirim CUID.
 */
// Refine tanggal yang sama dengan form tunggal: klien memang sudah
// mengosongkan tanggal masa depan/beda tahun di pratinjau, tetapi action adalah
// endpoint HTTP — payload langsung tidak boleh menyimpan apa yang form tolak.
export const bmpAssessmentImportRowSchema = z
  .object({
    rowNumber: z.number().int().min(1),
    farmerCode: z.string().trim().min(1, "ID Petani wajib ada"),
    parcelId: z.string().trim().min(1).nullable(),
    surveyYear: surveyYearField,
    surveyDate: surveyDateField,
    score: scoreField,
  })
  .superRefine(refineAssessment);

export const bmpAssessmentImportSchema = z.object({
  farmerGroupId: z.string().min(1, "Lembaga Petani wajib dipilih"),
  assessor: optionalText(120, "Nama penilai"),
  rows: z.array(bmpAssessmentImportRowSchema).min(1, "Tidak ada baris untuk diimpor").max(5000, "Maksimal 5.000 baris per berkas"),
});

export type BmpAssessmentImportInput = z.input<typeof bmpAssessmentImportSchema>;

// ── Rincian indikator (#346) ──────────────────────────────────────────────

/** Skor indikator dari FORM MANUAL: 0–3 atau null (tidak dinilai). */
const manualIndicatorScore = z.number().int("Skor harus bilangan bulat").min(0, "Skor minimal 0").max(3, "Skor maksimal 3").nullable();
/**
 * Skor indikator dari IMPORT form survei: 0–9 — nilai di luar rubrik (skor 4 di
 * 7 sel RSB) diterima dan ditandai di UI (keputusan owner 2026-09-20); batas 9
 * hanya menolak salah ketik yang jelas.
 */
const importedIndicatorScore = z.number().int("Skor harus bilangan bulat").min(0, "Skor minimal 0").max(9, "Skor tidak masuk akal").nullable();

const indicatorNotes = z
  .string()
  .trim()
  .max(500, "Catatan indikator maksimal 500 karakter")
  .transform((s) => (s === "" ? null : s))
  .nullable()
  .optional();

export const bmpIndicatorScoreSchema = z.object({
  indicatorId: z.string().min(1, "Indikator tidak valid"),
  score: manualIndicatorScore,
  notes: indicatorNotes,
});

/** Simpan rincian indikator INDIVIDU satu penilaian petani (form manual). */
export const saveBmpAssessmentDetailsSchema = z.object({
  assessmentId: z.string().min(1, "Penilaian tidak valid"),
  rows: z.array(bmpIndicatorScoreSchema).min(1, "Tidak ada indikator").max(64),
  /** Timpa `BmpAssessment.score` dengan hasil hitung ulang — hanya bila pengguna memintanya secara eksplisit. */
  applyRecomputedScore: z.boolean().optional(),
});
export type SaveBmpAssessmentDetailsInput = z.input<typeof saveBmpAssessmentDetailsSchema>;

const groupAssessmentFields = {
  farmerGroupId: z.string().min(1, "Lembaga Petani wajib dipilih"),
  surveyYear: surveyYearField,
  surveyDate: surveyDateField,
  assessor: optionalText(120, "Nama penilai"),
  notes: optionalText(2000, "Catatan"),
  rows: z.array(bmpIndicatorScoreSchema).max(64),
};

/** Penilaian LEMBAGA per tahun (14 indikator level LEMBAGA) — buat/ubah dari form manual. */
export const bmpGroupAssessmentSchema = z.object(groupAssessmentFields).superRefine(refineAssessment);
export type BmpGroupAssessmentInput = z.input<typeof bmpGroupAssessmentSchema>;

/** Satu form survei per petani hasil pratinjau klien (identitas = petani terpilih di dropdown). */
export const bmpSurveyFormImportSchema = z
  .object({
    fileName: z.string().trim().min(1).max(300),
    farmerId: z.string().min(1, "Petani wajib dipilih"),
    surveyYear: surveyYearField,
    surveyDate: surveyDateField,
    /** Skor akhir menurut form (Total raport) — angka resmi yang disimpan. */
    score: scoreField,
    individu: z.array(z.object({ indicatorId: z.string().min(1), score: importedIndicatorScore, notes: indicatorNotes })).max(64),
    lembaga: z.array(z.object({ indicatorId: z.string().min(1), score: importedIndicatorScore, notes: indicatorNotes })).max(64),
  })
  .superRefine(refineAssessment);

export const bmpSurveyImportSchema = z.object({
  farmerGroupId: z.string().min(1, "Lembaga Petani wajib dipilih"),
  assessor: optionalText(120, "Nama penilai"),
  forms: z.array(bmpSurveyFormImportSchema).min(1, "Tidak ada form untuk diimpor").max(300, "Maksimal 300 form per putaran"),
});
export type BmpSurveyImportInput = z.input<typeof bmpSurveyImportSchema>;
