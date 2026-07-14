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

// Peta BMP (MAP-02): Lembaga Tani is required; Provinsi/Distrik are optional
// (they only narrow the KT dropdown). Same non-CUID tolerance as above.
export const bmpMapFilterSchema = z.object({
  provinceId: z.string().min(1).nullish(),
  districtId: z.string().min(1).nullish(),
  farmerGroupId: z.string().min(1, { message: "Lembaga Tani wajib dipilih" }),
});

export type BmpMapFilterInput = z.infer<typeof bmpMapFilterSchema>;
