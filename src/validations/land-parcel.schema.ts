import { z } from "zod";

/**
 * Komoditas bawaan saat kolomnya kosong (keputusan owner 2026-09-01: seluruh
 * lahan di MIS hari ini Kelapa Sawit; 9.505 baris NULL diisi lewat UPDATE
 * sekali jalan). Default dipasang di SKEMA, bukan di tiap jalur tulis, karena
 * form dan Bulk Upload Lahan sama-sama lewat sini — menaruhnya di pemanggil
 * berarti importer berikutnya menulis NULL lagi tanpa gejala dan skor
 * Ketersediaan Data ikut turun diam-diam.
 */
export const DEFAULT_CROP_TYPE = "Kelapa Sawit";

export const landParcelSchema = z.object({
  farmerId: z.string().min(1, "Petani wajib dipilih"),
  parcelId: z.string().min(1, "ID Lahan wajib diisi"),
  blok: z.string().nullable().optional(),
  geometry: z.any().nullable().optional(),
  area: z.preprocess((val) => {
    if (val === "" || val === undefined || val === null) return null;
    const parsed = parseFloat(val as string);
    return isNaN(parsed) ? null : parsed;
  }, z.number().positive("Luas harus lebih dari 0").nullable().optional()),
  landStatus: z.string().nullable().optional(),
  // Kosong/whitespace → DEFAULT_CROP_TYPE. Nilai yang diisi user tetap
  // dihormati apa adanya (trim saja), supaya komoditas non-sawit tetap bisa
  // dicatat begitu ada.
  cropType: z.preprocess((val) => {
    if (typeof val !== "string") return DEFAULT_CROP_TYPE;
    return val.trim() || DEFAULT_CROP_TYPE;
  }, z.string()),
  species: z.string().nullable().optional(),
  isPsr: z.boolean().optional(),
  plantingYear: z.preprocess((val) => {
    if (val === "" || val === undefined || val === null) return null;
    const parsed = parseInt(val as string, 10);
    return isNaN(parsed) ? null : parsed;
  }, z.number().int().min(1900, "Tahun tanam minimal 1900").max(2100, "Tahun tanam maksimal 2100").nullable().optional()),
  notes: z.string().nullable().optional(),
  subGroupLv2: z.string().nullable().optional(), // Kelompok Tani
});

export const updateLandParcelSchema = landParcelSchema.extend({
  id: z.string(),
});

export type LandParcelInput = z.infer<typeof landParcelSchema>;
export type UpdateLandParcelInput = z.infer<typeof updateLandParcelSchema>;
