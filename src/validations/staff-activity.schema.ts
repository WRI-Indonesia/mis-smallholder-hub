import { z } from "zod";

export const staffActivitySchema = z.object({
  id: z.string().optional(),
  activityDate: z.string().min(1, "Tanggal wajib diisi"),
  planning: z.string().min(1, "Rencana aktivitas wajib diisi"),
  realization: z.string().optional().or(z.literal("")),
  comment: z.string().optional().or(z.literal("")),
});

export type StaffActivityFormValues = z.infer<typeof staffActivitySchema>;

export const rejectActivitySchema = z.object({
  rejectionNote: z.string().min(1, "Catatan penolakan wajib diisi"),
});

export type RejectActivityFormValues = z.infer<typeof rejectActivitySchema>;
