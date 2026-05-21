import { z } from "zod";

export const farmerGroupSchema = z.object({
  districtId: z.string().min(1, "Distrik wajib dipilih"),
  code: z.string().nullable().optional(),
  abrv: z.string().nullable().optional(),
  abrv3id: z.string().nullable().optional(),
  name: z.string().min(2, "Nama minimal 2 karakter"),
  category: z.enum(["EX_PLASMA", "SWADAYA"]),
  joinYear: z.number().int().nullable().optional(),
  locationLat: z.number().nullable().optional(),
  locationLong: z.number().nullable().optional(),
});

export const updateFarmerGroupSchema = farmerGroupSchema.extend({
  id: z.string(),
});

export type FarmerGroupInput = z.infer<typeof farmerGroupSchema>;
export type UpdateFarmerGroupInput = z.infer<typeof updateFarmerGroupSchema>;
