import * as z from "zod"

export const trainingTypeSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  description: z.string().optional().nullable(),
})

export type TrainingTypeFormValues = z.infer<typeof trainingTypeSchema>
