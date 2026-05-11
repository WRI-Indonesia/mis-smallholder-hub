import { z } from "zod";

export const dashboardFiltersSchema = z.object({
  districtId: z.string().optional(),
  batchId: z.string().optional(),
});

export type DashboardFiltersInput = z.infer<typeof dashboardFiltersSchema>;