import { z } from "zod";

export const farmerSchema = z.object({
  farmerGroupId: z.string().min(1, "Kelompok tani wajib dipilih"),
  gender: z.enum(["M", "F"], { message: "Jenis kelamin wajib dipilih" }),
  name: z.string().min(2, "Nama minimal 2 karakter"),
  farmerId: z.string().min(2, "ID Petani minimal 2 karakter"),
  nik: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  birthPlace: z.string().nullable().optional(),
  birthDate: z.preprocess((val) => {
    if (!val || val === "") return null;
    if (typeof val === "string") return new Date(val);
    return val;
  }, z.date().nullable().optional()),
  joinedYear: z.preprocess((val) => {
    if (val === "" || val === undefined || val === null) return null;
    const parsed = parseInt(val as string, 10);
    return isNaN(parsed) ? null : parsed;
  }, z.number().int().min(1900, "Tahun bergabung minimal 1900").max(2100, "Tahun bergabung maksimal 2100").nullable().optional()),
});

export const updateFarmerSchema = farmerSchema.extend({
  id: z.string(),
});

export type FarmerInput = z.infer<typeof farmerSchema>;
export type UpdateFarmerInput = z.infer<typeof updateFarmerSchema>;
