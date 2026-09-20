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

function refineAssessment(v: { surveyYear: number; surveyDate?: Date | null }, ctx: z.RefinementCtx) {
  if (!v.surveyDate) return;
  if (v.surveyDate.getTime() > Date.now()) {
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
export const bmpAssessmentImportRowSchema = z.object({
  rowNumber: z.number().int().min(1),
  farmerCode: z.string().trim().min(1, "ID Petani wajib ada"),
  parcelId: z.string().trim().min(1).nullable(),
  surveyYear: surveyYearField,
  surveyDate: surveyDateField,
  score: scoreField,
});

export const bmpAssessmentImportSchema = z.object({
  farmerGroupId: z.string().min(1, "Lembaga Petani wajib dipilih"),
  assessor: optionalText(120, "Nama penilai"),
  rows: z.array(bmpAssessmentImportRowSchema).min(1, "Tidak ada baris untuk diimpor").max(5000, "Maksimal 5.000 baris per berkas"),
});

export type BmpAssessmentImportInput = z.input<typeof bmpAssessmentImportSchema>;
