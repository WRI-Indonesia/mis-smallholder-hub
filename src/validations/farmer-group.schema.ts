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
  ispoCertYear: z.number().int().nullable().optional(),
  ispoCertStatus: z.enum(["CERTIFIED", "PLANNED"]).nullable().optional(),
  sapMapAssuranceYear: z.number().int().nullable().optional(),
  sapMapAssuranceStatus: z.enum(["CERTIFIED", "PLANNED"]).nullable().optional(),
  locationLat: z.number().nullable().optional(),
  locationLong: z.number().nullable().optional(),
});

// Tahun sertifikasi/assurance tanpa status itu ambigu ("2026" = tersertifikasi
// atau rencana?) — wajib pilih status jika tahun diisi. Sebaliknya status
// tanpa tahun sah (data riil ada yang tersertifikasi tanpa info tahun).
// Berlaku seragam untuk RSPO, ISPO, dan SAP/MAP (#160, #169).
const hasStatusIfYear = (year?: number | null, status?: string | null) =>
  !(year != null && status == null);

const rspoStatusRequired = {
  message: "Status sertifikasi wajib dipilih jika tahun sertifikasi diisi",
  path: ["rspoCertStatus"],
};
const ispoStatusRequired = {
  message: "Status sertifikasi wajib dipilih jika tahun sertifikasi diisi",
  path: ["ispoCertStatus"],
};
const sapMapStatusRequired = {
  message: "Status assurance wajib dipilih jika tahun assurance diisi",
  path: ["sapMapAssuranceStatus"],
};

export const farmerGroupSchema = baseFarmerGroupSchema
  .refine((d) => hasStatusIfYear(d.rspoCertYear, d.rspoCertStatus), rspoStatusRequired)
  .refine((d) => hasStatusIfYear(d.ispoCertYear, d.ispoCertStatus), ispoStatusRequired)
  .refine((d) => hasStatusIfYear(d.sapMapAssuranceYear, d.sapMapAssuranceStatus), sapMapStatusRequired);

export const updateFarmerGroupSchema = baseFarmerGroupSchema
  .extend({ id: z.string() })
  .refine((d) => hasStatusIfYear(d.rspoCertYear, d.rspoCertStatus), rspoStatusRequired)
  .refine((d) => hasStatusIfYear(d.ispoCertYear, d.ispoCertStatus), ispoStatusRequired)
  .refine((d) => hasStatusIfYear(d.sapMapAssuranceYear, d.sapMapAssuranceStatus), sapMapStatusRequired);

export type FarmerGroupInput = z.infer<typeof farmerGroupSchema>;
export type UpdateFarmerGroupInput = z.infer<typeof updateFarmerGroupSchema>;
