import { z } from "zod";

// IDs are not uniformly CUIDs: region tables (Province/District) use numeric
// BPS codes as their primary key, while FarmerGroup uses CUIDs. Accept any
// non-empty id and let the DB queries enforce existence + access scope.
export const mapFilterSchema = z.object({
  provinceId: z.string().min(1).nullish(),
  districtId: z.string().min(1, { message: "Distrik wajib dipilih" }),
  farmerGroupId: z.string().min(1).nullish(),
});

export type MapFilterInput = z.infer<typeof mapFilterSchema>;
