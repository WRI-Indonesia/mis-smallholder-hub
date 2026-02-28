import * as z from "zod"

export const villageSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(1, { message: "Code is required" }),
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  subDistrictId: z.string().min(1, { message: "Please select a sub-district" })
})

export type VillageFormValues = z.infer<typeof villageSchema>
