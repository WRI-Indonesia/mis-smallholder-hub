import { z } from "zod";

// Base object schema
export const productionBaseSchema = z.object({
  farmerId: z.string().cuid("ID petani tidak valid"),
  
  parcelId: z.string().cuid("ID lahan tidak valid").optional().nullable(),
  
  period: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Format periode harus YYYY-MM (contoh: 2026-06)"),
  
  harvestDate: z.preprocess((val) => {
    if (typeof val === "string") return new Date(val);
    return val;
  }, z.date({
    message: "Format tanggal tidak valid"
  })).refine((d) => !isNaN(d.getTime()), {
    message: "Format tanggal tidak valid"
  }),
  
  harvestNumber: z
    .number({ message: "Panen ke-X wajib diisi" })
    .int("Harus bilangan bulat")
    .min(1, "Minimal panen ke-1")
    .max(4, "Maksimal panen ke-4 per bulan"),
  
  yieldKg: z
    .number({ message: "Hasil panen wajib diisi" })
    .positive("Hasil panen harus lebih besar dari 0")
    .max(999999, "Hasil panen terlalu besar"),
  
  notes: z
    .string()
    .max(500, "Catatan maksimal 500 karakter")
    .optional()
    .nullable()
});

// Create schema with refinements
export const productionSchema = productionBaseSchema.refine(
  (data) => {
    // Validate harvest date is within period
    const [year, month] = data.period.split("-").map(Number);
    const harvestMonth = data.harvestDate.getMonth() + 1;
    const harvestYear = data.harvestDate.getFullYear();
    return harvestYear === year && harvestMonth === month;
  },
  {
    message: "Tanggal panen harus dalam periode bulan yang dipilih",
    path: ["harvestDate"]
  }
);

// Update schema (all fields optional except validation)
export const productionUpdateSchema = productionBaseSchema
  .omit({ farmerId: true }) // farmerId tidak bisa diubah
  .partial();

export type ProductionInput = z.infer<typeof productionSchema>;
export type ProductionUpdateInput = z.infer<typeof productionUpdateSchema>;
