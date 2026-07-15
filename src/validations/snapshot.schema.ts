import { z } from "zod";

export const snapshotFiltersSchema = z.object({
  districtId: z.string().min(1).nullable().optional(),
  joinedYear: z.number().int().min(1900).max(2100).nullable().optional(),
});

export type SnapshotFiltersInput = z.infer<typeof snapshotFiltersSchema>;

// Dashboard BMP snapshot (DASH-04, #166) — tanpa joinedYear; tahun difilter client-side.
export const bmpSnapshotFiltersSchema = z.object({
  districtId: z.string().min(1).nullable().optional(),
});

export type BmpSnapshotFiltersInput = z.infer<typeof bmpSnapshotFiltersSchema>;
