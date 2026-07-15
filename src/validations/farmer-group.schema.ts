import { z } from "zod";

const baseFarmerGroupSchema = z.object({
  districtId: z.string().min(1, "Distrik wajib dipilih"),
  code: z.string().nullable().optional(),
  abrv: z.string().nullable().optional(),
  abrv3id: z.string().nullable().optional(),
  name: z.string().min(2, "Nama minimal 2 karakter"),
  category: z.enum(["EX_PLASMA", "SWADAYA"]),
  groupType: z.enum(["ASOSIASI", "KOPERASI"]).nullable().optional(),
  joinYear: z.number().int().nullable().optional(),
  establishedYear: z.number().int().nullable().optional(),
  rspoCertYear: z.number().int().nullable().optional(),
  rspoCertStatus: z.enum(["CERTIFIED", "PLANNED"]).nullable().optional(),
  locationLat: z.number().nullable().optional(),
  locationLong: z.number().nullable().optional(),
});

// Tahun sertifikasi RSPO tanpa status itu ambigu ("2026" = tersertifikasi
// atau rencana?) — wajib pilih status jika tahun diisi. Sebaliknya status
// tanpa tahun sah (data riil ada yang tersertifikasi tanpa info tahun).
const rspoStatusRequired = {
  message: "Status sertifikasi wajib dipilih jika tahun sertifikasi diisi",
  path: ["rspoCertStatus"],
};
const hasRspoStatusIfYear = (d: { rspoCertYear?: number | null; rspoCertStatus?: string | null }) =>
  !(d.rspoCertYear != null && d.rspoCertStatus == null);

export const farmerGroupSchema = baseFarmerGroupSchema.refine(hasRspoStatusIfYear, rspoStatusRequired);

export const updateFarmerGroupSchema = baseFarmerGroupSchema
  .extend({ id: z.string() })
  .refine(hasRspoStatusIfYear, rspoStatusRequired);

export type FarmerGroupInput = z.infer<typeof farmerGroupSchema>;
export type UpdateFarmerGroupInput = z.infer<typeof updateFarmerGroupSchema>;
