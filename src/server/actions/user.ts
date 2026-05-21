"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { createUserSchema, updateUserSchema } from "@/validations/user.schema";
import type { CreateUserInput, UpdateUserInput } from "@/validations/user.schema";

export async function getUsers(search?: string) {
  const where = {
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  return prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { name: "asc" },
  });
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      provinces: { select: { provinceId: true } },
      districts: { select: { districtId: true } },
      farmerGroups: { select: { farmerGroupId: true } },
    },
  });
}

export async function createUser(input: CreateUserInput) {
  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return { success: false, error: { email: ["Email sudah terdaftar"] } };

  const hashedPassword = await bcrypt.hash(parsed.data.password, 10);

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      password: hashedPassword,
      role: parsed.data.role,
    },
  });

  return { success: true, data: { id: user.id } };
}

export async function updateUser(input: UpdateUserInput) {
  const parsed = updateUserSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

  const data: Record<string, unknown> = {
    name: parsed.data.name,
    email: parsed.data.email,
    role: parsed.data.role,
  };

  if (parsed.data.password && parsed.data.password.length > 0) {
    data.password = await bcrypt.hash(parsed.data.password, 10);
  }

  await prisma.user.update({ where: { id: parsed.data.id }, data });

  return { success: true };
}

export async function toggleUserActive(id: string) {
  const user = await prisma.user.findUnique({ where: { id }, select: { isActive: true } });
  if (!user) return { success: false, error: "User tidak ditemukan" };

  await prisma.user.update({
    where: { id },
    data: { isActive: !user.isActive },
  });

  return { success: true };
}
