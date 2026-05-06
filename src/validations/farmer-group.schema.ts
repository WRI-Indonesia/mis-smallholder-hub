import { z } from "zod";

/**
 * Preprocessor that converts empty strings and null to undefined,
 * and coerces valid values to numbers. This avoids the `unknown` type
 * issue that z.coerce.number() causes with React Hook Form's zodResolver.
 */
const optionalCoordinate = (min: number, max: number) =>
  z
    .union([z.null(), z.literal(""), z.coerce.number().min(min).max(max)])
    .optional()
    .transform((val) => (val === "" ? null : val));

export const farmerGroupSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Nama minimal 2 karakter"),
  code: z.string().optional().or(z.literal("")),
  abrv: z.string().optional().or(z.literal("")),
  abrv3id: z
    .string()
    .max(50, "Singkatan 3ID maksimal 50 karakter")
    .optional()
    .or(z.literal("")),
  districtId: z.string().min(1, "Kabupaten wajib dipilih"),
  locationLat: optionalCoordinate(-90, 90),
  locationLong: optionalCoordinate(-180, 180),
});

export type FarmerGroupFormValues = z.infer<typeof farmerGroupSchema>;
