import { z } from "zod";

export const snapshotFiltersSchema = z.object({
  districtId: z.string().min(1).nullable().optional(),
  joinedYear: z.number().int().min(1900).max(2100).nullable().optional(),
});

export type SnapshotFiltersInput = z.infer<typeof snapshotFiltersSchema>;
