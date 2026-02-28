import * as z from "zod"

export const subDistrictSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(1, { message: "Code is required" }),
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  districtId: z.string().min(1, { message: "Please select a district" })
})

export type SubDistrictFormValues = z.infer<typeof subDistrictSchema>
