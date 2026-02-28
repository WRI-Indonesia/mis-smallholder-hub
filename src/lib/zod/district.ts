import * as z from "zod"

export const districtSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(1, { message: "Code is required" }),
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  provinceId: z.string().min(1, { message: "Please select a province" })
})

export type DistrictFormValues = z.infer<typeof districtSchema>
