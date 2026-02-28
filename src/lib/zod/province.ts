import * as z from "zod"

export const provinceSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(1, { message: "Code is required" }),
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
})

export type ProvinceFormValues = z.infer<typeof provinceSchema>
