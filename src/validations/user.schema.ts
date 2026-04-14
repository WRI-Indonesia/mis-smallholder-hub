import { z } from "zod";
import { Role } from "@prisma/client";

export const userSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters." })
    .optional()
    .or(z.literal("")), // Optional for updates
  role: z.nativeEnum(Role),
  isActive: z.boolean(),
});

export type UserFormValues = z.infer<typeof userSchema>;
