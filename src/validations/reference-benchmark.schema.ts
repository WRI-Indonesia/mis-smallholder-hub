import { z } from "zod";

const countField = z
  .number({ message: "Harus berupa angka" })
  .int("Harus bilangan bulat")
  .min(0, "Tidak boleh negatif")
  .nullable();

/** Input upsert angka acuan manual per lembaga (Komparasi Data Acuan, #243). */
export const referenceBenchmarkSchema = z.object({
  farmerGroupId: z.string().min(1, "Lembaga Petani wajib dipilih"),
  farmerCount: countField,
  parcelCount: countField,
  areaHa: z
    .number({ message: "Harus berupa angka" })
    .min(0, "Tidak boleh negatif")
    .nullable(),
  trainingP1: countField,
  trainingP2Mk: countField,
  trainingP2K3: countField,
  trainingP34: countField,
  productionFarmerCount: countField,
  notes: z.string().max(2000, "Catatan maksimal 2000 karakter").nullable(),
});

export type ReferenceBenchmarkInput = z.infer<typeof referenceBenchmarkSchema>;
