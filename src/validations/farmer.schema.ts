import { z } from "zod";

export const farmerSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Nama minimal 2 karakter"),
  nik: z.string()
    .length(16, "NIK harus 16 digit")
    .regex(/^\d+$/, "NIK hanya angka"),
  gender: z.enum(["L", "P"], { message: "Pilih jenis kelamin" }),
  birthdate: z.coerce.date({ message: "Tanggal lahir tidak valid" })
    .refine((d) => d <= new Date(), { message: "Tanggal lahir tidak boleh di masa depan" })
    .optional()
    .or(z.literal("")),
  farmerGroupId: z.string().min(1, "Kelompok tani wajib dipilih"),
  batchId: z.string().optional().or(z.literal("")),
  wriFarmerId: z.string().optional().or(z.literal("")),
  uiFarmerId: z.string().optional().or(z.literal("")),
  status: z.string().optional().or(z.literal("")),
});

export type FarmerFormValues = z.infer<typeof farmerSchema>;
