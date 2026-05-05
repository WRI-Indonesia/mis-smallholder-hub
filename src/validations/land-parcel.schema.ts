import { z } from "zod";

/**
 * Preprocessor that converts empty strings and null to undefined/null,
 * and coerces valid values to positive numbers.
 */
const optionalPositiveNumber = z
  .union([z.null(), z.literal(""), z.coerce.number().positive("Luas harus positif")])
  .optional()
  .transform((val) => (val === "" ? null : val));

export const landParcelSchema = z.object({
  id: z.string().optional(),
  farmerId: z.string().min(1, "Petani wajib dipilih"),
  commodityCode: z.string().optional().or(z.literal("")),
  parcelCode: z.string().optional().or(z.literal("")),
  polygonSizeHa: optionalPositiveNumber,
  legalId: z.string().optional().or(z.literal("")),
  legalSizeHa: optionalPositiveNumber,
  status: z.string().optional().or(z.literal("")),
});

export type LandParcelFormValues = z.infer<typeof landParcelSchema>;
