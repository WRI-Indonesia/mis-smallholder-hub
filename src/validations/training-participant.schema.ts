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
