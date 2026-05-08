import { z } from "zod";

/**
 * Schema for TrainingActivity form (create/edit).
 * Evidence URL is handled separately via S3 upload — not part of this schema.
 */
export const trainingActivitySchema = z.object({
  id: z.string().optional(),
  packageId: z.string().min(1, "Paket training wajib dipilih"),
  farmerGroupId: z.string().min(1, "Kelompok tani wajib dipilih"),
  location: z.string().optional().or(z.literal("")),
  trainingDate: z.string().min(1, "Tanggal training wajib diisi"),
});

export type TrainingActivityFormValues = z.infer<typeof trainingActivitySchema>;
