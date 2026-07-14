import { z } from "zod";

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
  cropType: z.string().nullable().optional(),
  plantingYear: z.preprocess((val) => {
    if (val === "" || val === undefined || val === null) return null;
    const parsed = parseInt(val as string, 10);
    return isNaN(parsed) ? null : parsed;
  }, z.number().int().min(1900, "Tahun tanam minimal 1900").max(2100, "Tahun tanam maksimal 2100").nullable().optional()),
  notes: z.string().nullable().optional(),
  subGroupLv1: z.string().nullable().optional(), // Gapoktan
  subGroupLv2: z.string().nullable().optional(), // Kelompok Tani
});

export const updateLandParcelSchema = landParcelSchema.extend({
  id: z.string(),
});

export type LandParcelInput = z.infer<typeof landParcelSchema>;
export type UpdateLandParcelInput = z.infer<typeof updateLandParcelSchema>;
