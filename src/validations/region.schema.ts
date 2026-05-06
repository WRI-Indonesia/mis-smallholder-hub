import { z } from "zod";

export const provinceSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(2, "Kode minimal 2 karakter"),
  name: z.string().min(2, "Nama minimal 2 karakter"),
});

export type ProvinceFormValues = z.infer<typeof provinceSchema>;

export const districtSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(4, "Kode minimal 4 karakter"),
  name: z.string().min(2, "Nama minimal 2 karakter"),
  provinceId: z.string().min(1, "Provinsi wajib dipilih"),
});

export type DistrictFormValues = z.infer<typeof districtSchema>;

export const subdistrictSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(6, "Kode minimal 6 karakter"),
  name: z.string().min(2, "Nama minimal 2 karakter"),
  districtId: z.string().min(1, "Kabupaten wajib dipilih"),
});

export type SubdistrictFormValues = z.infer<typeof subdistrictSchema>;

export const villageSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(10, "Kode minimal 10 karakter"),
  name: z.string().min(2, "Nama minimal 2 karakter"),
  subdistrictId: z.string().min(1, "Kecamatan wajib dipilih"),
});

export type VillageFormValues = z.infer<typeof villageSchema>;
