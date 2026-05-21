"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function changePassword(currentPassword: string, newPassword: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Tidak terautentikasi" };

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return { success: false, error: "User tidak ditemukan" };

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) return { success: false, error: "Password lama salah" };

  if (newPassword.length < 6) return { success: false, error: "Password baru minimal 6 karakter" };

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { password: hashed },
  });

  return { success: true };
}
