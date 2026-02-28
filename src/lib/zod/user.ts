import * as z from "zod"
import { Role } from "@prisma/client"

export const userSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  role: z.nativeEnum(Role, { message: "Please select a valid role." }),
  password: z.string().optional().refine(val => !val || val.length >= 6, {
     message: "Password must be at least 6 characters if provided."
  }),
})

export type UserFormValues = z.infer<typeof userSchema>
