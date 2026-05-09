import { z } from "zod";

export const staffSchema = z.object({
  id: z.string().optional(),
  staffCode: z.string().min(1, "Kode staff wajib diisi"),
  name: z.string().min(2, "Nama minimal 2 karakter"),
  jobDeskId: z.string().min(1, "Job desk wajib dipilih"),
  emailWri: z
    .string()
    .email("Format email tidak valid")
    .optional()
    .or(z.literal("")),
  lineManagerId: z.string().optional().or(z.literal("")).nullable(),
  // IDs of assigned districts
  districtIds: z.array(z.string()).default([]),
  // IDs of assigned farmer groups
  farmerGroupIds: z.array(z.string()).default([]),
});

export type StaffFormValues = z.infer<typeof staffSchema>;
