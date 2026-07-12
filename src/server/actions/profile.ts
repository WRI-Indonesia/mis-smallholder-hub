"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { changePasswordSchema } from "@/validations/profile.schema";

export async function changePassword(currentPassword: string, newPassword: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Tidak terautentikasi" };

  const parsed = changePasswordSchema.safeParse({ currentPassword, newPassword });
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return {
      success: false,
      error: fieldErrors.currentPassword?.[0] ?? fieldErrors.newPassword?.[0] ?? "Input tidak valid",
    };
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return { success: false, error: "User tidak ditemukan" };

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.password);
  if (!valid) return { success: false, error: "Password lama salah" };

  const hashed = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { password: hashed },
  });

  return { success: true };
}
