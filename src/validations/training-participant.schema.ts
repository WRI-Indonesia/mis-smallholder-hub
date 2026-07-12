import { z } from "zod";

export const trainingParticipantScoreSchema = z.object({
  preTestScore: z.coerce
    .number()
    .int()
    .min(0, "Nilai pre-test minimal 0")
    .max(100, "Nilai pre-test maksimal 100")
    .nullable()
    .optional(),
  postTestScore: z.coerce
    .number()
    .int()
    .min(0, "Nilai post-test minimal 0")
    .max(100, "Nilai post-test maksimal 100")
    .nullable()
    .optional(),
});

export type TrainingParticipantScoreInput = z.infer<typeof trainingParticipantScoreSchema>;

export const addParticipantsSchema = z.object({
  activityId: z.string().min(1, "Aktivitas pelatihan wajib dipilih"),
  participants: z
    .array(
      trainingParticipantScoreSchema.extend({
        farmerId: z.string().min(1, "Petani wajib dipilih"),
      })
    )
    .min(1, "Minimal satu peserta harus dipilih"),
});

export type AddParticipantsInput = z.infer<typeof addParticipantsSchema>;
