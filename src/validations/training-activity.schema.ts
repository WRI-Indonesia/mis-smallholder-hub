import { z } from "zod";

export const trainingActivitySchema = z.object({
  packageId: z.string().min(1, "Paket pelatihan wajib dipilih"),
  farmerGroupId: z.string().min(1, "Kelompok tani wajib dipilih"),
  trainingDate: z.preprocess((val) => {
    if (!val || val === "") return null;
    if (typeof val === "string") return new Date(val);
    return val;
  }, z.date({ message: "Tanggal pelatihan wajib diisi" })),
  location: z.string().nullable().optional(),
  evidenceKey: z.string().nullable().optional(),
  evidenceName: z.string().nullable().optional(),
});

export const updateTrainingActivitySchema = trainingActivitySchema.extend({
  id: z.string(),
});

export type TrainingActivityInput = z.infer<typeof trainingActivitySchema>;
export type UpdateTrainingActivityInput = z.infer<typeof updateTrainingActivitySchema>;
