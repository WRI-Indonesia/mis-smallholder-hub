import { z } from "zod";

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Password lama wajib diisi"),
  newPassword: z.string().min(6, "Password baru minimal 6 karakter"),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
