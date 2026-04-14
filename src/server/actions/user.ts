"use server";

import { prisma } from "@/lib/prisma";
import { userSchema, UserFormValues } from "@/validations/user.schema";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";

export async function getUsers() {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
    return { success: true, data: users };
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return { success: false, error: "Failed to fetch users" };
  }
}

export async function createUser(data: UserFormValues) {
  try {
    const validatedData = userSchema.parse(data);

    if (!validatedData.password) {
      return { success: false, error: "Password is required for new users." };
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return { success: false, error: "Email already exists." };
    }

    const hashedPassword = bcrypt.hashSync(validatedData.password, 10);

    await prisma.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        password: hashedPassword,
        role: validatedData.role,
        isActive: validatedData.isActive,
      },
    });

    revalidatePath("/admin/settings/users");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to create user:", error);
    return { success: false, error: error?.message || "Failed to create user" };
  }
}

export async function updateUser(id: string, data: Partial<UserFormValues>) {
  try {
    const updateData: any = {
      name: data.name,
      email: data.email,
      role: data.role as Role,
      isActive: data.isActive,
    };

    if (data.password && data.password.length >= 6) {
      updateData.password = bcrypt.hashSync(data.password, 10);
    }

    await prisma.user.update({
      where: { id },
      data: updateData,
    });

    revalidatePath("/admin/settings/users");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update user:", error);
    return { success: false, error: error?.message || "Failed to update user" };
  }
}

export async function deleteUser(id: string) {
  try {
    await prisma.user.delete({
      where: { id },
    });

    revalidatePath("/admin/settings/users");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete user:", error);
    return { success: false, error: "Failed to delete user" };
  }
}

export async function toggleUserStatus(id: string, currentStatus: boolean) {
  try {
    await prisma.user.update({
      where: { id },
      data: { isActive: !currentStatus },
    });
    revalidatePath("/admin/settings/users");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to toggle status" };
  }
}
