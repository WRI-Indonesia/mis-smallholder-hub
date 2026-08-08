import { z } from "zod";

// Baris pohon hasil parse shapefile (sudah dinormalkan di lib/tree-upload).
export const treeRowSchema = z.object({
  treeId: z.number().int().nullable(),
  sequenceNo: z.number().int().nullable(),
  longitude: z.number().min(-180).max(180),
  latitude: z.number().min(-90).max(90),
  category: z.string().nullable(),
  vigor: z.number().nullable(),
  source: z.string().nullable(),
  modelVersion: z.string().nullable(),
});

// Satu set pohon untuk satu lahan (satu ZIP bisa memuat beberapa set).
export const treeGroupSchema = z.object({
  parcelId: z.string().min(1, "parcel_id wajib ada"),
  rows: z.array(treeRowSchema).min(1, "Tidak ada titik pohon").max(50_000, "Terlalu banyak titik dalam satu lahan"),
});

export const bulkCreateTreesSchema = z.object({
  sourceFile: z.string().nullable().optional(),
  groups: z.array(treeGroupSchema).min(1, "Tidak ada data pohon untuk disimpan"),
});

export type TreeRowInput = z.infer<typeof treeRowSchema>;
export type BulkCreateTreesInput = z.infer<typeof bulkCreateTreesSchema>;
