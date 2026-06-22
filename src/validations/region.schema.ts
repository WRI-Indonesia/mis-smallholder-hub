import { z } from "zod";

// ─── Province ───────────────────────────────────────────────────────────────

export const provinceSchema = z.object({
  code: z.string().min(1, "Kode wajib diisi"),
  name: z.string().min(2, "Nama minimal 2 karakter"),
});

export const updateProvinceSchema = z.object({
  id: z.string(),
  code: z.string().min(1, "Kode wajib diisi"),
  name: z.string().min(2, "Nama minimal 2 karakter"),
});

export type ProvinceInput = z.infer<typeof provinceSchema>;
export type UpdateProvinceInput = z.infer<typeof updateProvinceSchema>;

// ─── District ───────────────────────────────────────────────────────────────

export const districtSchema = z.object({
  provinceId: z.string().min(1, "Provinsi wajib dipilih"),
  code: z.string().min(1, "Kode wajib diisi"),
  name: z.string().min(2, "Nama minimal 2 karakter"),
});

export const updateDistrictSchema = z.object({
  id: z.string(),
  provinceId: z.string().min(1, "Provinsi wajib dipilih"),
  code: z.string().min(1, "Kode wajib diisi"),
  name: z.string().min(2, "Nama minimal 2 karakter"),
});

export type DistrictInput = z.infer<typeof districtSchema>;
export type UpdateDistrictInput = z.infer<typeof updateDistrictSchema>;

// ─── Subdistrict ────────────────────────────────────────────────────────────

export const subdistrictSchema = z.object({
  districtId: z.string().min(1, "Distrik wajib dipilih"),
  code: z.string().min(1, "Kode wajib diisi"),
  name: z.string().min(2, "Nama minimal 2 karakter"),
});

export const updateSubdistrictSchema = z.object({
  id: z.string(),
  districtId: z.string().min(1, "Distrik wajib dipilih"),
  code: z.string().min(1, "Kode wajib diisi"),
  name: z.string().min(2, "Nama minimal 2 karakter"),
});

export type SubdistrictInput = z.infer<typeof subdistrictSchema>;
export type UpdateSubdistrictInput = z.infer<typeof updateSubdistrictSchema>;

// ─── Village ─────────────────────────────────────────────────────────────────

export const villageSchema = z.object({
  subdistrictId: z.string().min(1, "Kecamatan wajib dipilih"),
  code: z.string().min(1, "Kode wajib diisi"),
  name: z.string().min(2, "Nama minimal 2 karakter"),
});

export const updateVillageSchema = z.object({
  id: z.string(),
  subdistrictId: z.string().min(1, "Kecamatan wajib dipilih"),
  code: z.string().min(1, "Kode wajib diisi"),
  name: z.string().min(2, "Nama minimal 2 karakter"),
});

export type VillageInput = z.infer<typeof villageSchema>;
export type UpdateVillageInput = z.infer<typeof updateVillageSchema>;
