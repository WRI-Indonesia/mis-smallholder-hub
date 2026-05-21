import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter"),
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  role: z.enum(["SUPERADMIN", "ADMIN", "OPERATOR", "MANAGEMENT"]),
});

export const updateUserSchema = z.object({
  id: z.string(),
  name: z.string().min(2, "Nama minimal 2 karakter"),
  email: z.string().email("Email tidak valid"),
  role: z.enum(["SUPERADMIN", "ADMIN", "OPERATOR", "MANAGEMENT"]),
  password: z.string().min(6).optional().or(z.literal("")),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
