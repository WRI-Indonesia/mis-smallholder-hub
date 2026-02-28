import * as z from "zod"

export const menuSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(2, { message: "Title must be at least 2 characters." }),
  url: z.string().min(1, { message: "URL is required (use '/' for root or '#' for placeholder)" }),
  icon: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  order: z.number().int().min(0, { message: "Order must be a positive integer" })
})

export type MenuFormValues = z.infer<typeof menuSchema>
