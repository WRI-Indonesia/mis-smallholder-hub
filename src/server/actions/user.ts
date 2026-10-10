"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { createUserSchema, updateUserSchema } from "@/validations/user.schema";
import type { CreateUserInput, UpdateUserInput } from "@/validations/user.schema";
import { hasPermission } from "@/lib/rbac";
import { getAccessContext } from "@/lib/access-context";
import { roleGrantError, userAdminScopeError, userTargetError, type UserRef } from "@/lib/user-admin-guard";

/** Pemanggil dari sesi — dasar aturan anti-eskalasi (#386 butir 2). */
async function sessionActor(): Promise<UserRef & { sessionId: string | null }> {
  const session = await auth();
  return { id: session?.user?.id ?? "", role: session?.user?.role ?? "", sessionId: session?.user?.id ?? null };
}

/** Email sudah dipakai akun lain? Banding tanpa beda huruf besar — login juga tak membedakan (`auth.ts`). */
async function emailTaken(email: string, exceptId?: string): Promise<boolean> {
  const found = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" }, ...(exceptId ? { NOT: { id: exceptId } } : {}) },
    select: { id: true },
  });
  return !!found;
}

export async function getUsers(search?: string) {
  if (!(await hasPermission("settings-users", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }
  const scopeError = userAdminScopeError(await getAccessContext());
  if (scopeError) throw new Error(scopeError);

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
      provinces: { select: { province: { select: { name: true } } } },
      districts: { select: { district: { select: { name: true } } } },
      farmerGroups: { select: { farmerGroup: { select: { name: true, abrv: true } } } },
      permissionOverrides: { select: { id: true, granted: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function createUser(input: CreateUserInput) {
  if (!(await hasPermission("settings-users", "CREATE"))) {
    return { success: false, error: "Tidak memiliki izin untuk menambah user" };
  }

  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

  const actor = await sessionActor();
  const guardError = userAdminScopeError(await getAccessContext()) ?? roleGrantError(actor, parsed.data.role);
  if (guardError) return { success: false, error: guardError };

  if (await emailTaken(parsed.data.email)) return { success: false, error: { email: ["Email sudah terdaftar"] } };

  const hashedPassword = await bcrypt.hash(parsed.data.password, 10);

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      password: hashedPassword,
      role: parsed.data.role,
      createdBy: actor.sessionId,
    },
  });

  return { success: true, data: { id: user.id } };
}

export async function updateUser(input: UpdateUserInput) {
  if (!(await hasPermission("settings-users", "EDIT"))) {
     return { success: false, error: "Tidak memiliki izin untuk mengubah user" };
  }

  const parsed = updateUserSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

  // Anti-eskalasi (#386 butir 2): akun SUPERADMIN & role SUPERADMIN hanya oleh SUPERADMIN;
  // akun sendiri boleh diubah nama/email/password, tetapi tidak role-nya.
  const actor = await sessionActor();
  const target = await prisma.user.findUnique({ where: { id: parsed.data.id }, select: { id: true, role: true } });
  const guardError =
    userAdminScopeError(await getAccessContext()) ??
    userTargetError(actor, target, { allowSelf: true }) ??
    roleGrantError(actor, parsed.data.role) ??
    (target && target.id === actor.id && target.role !== parsed.data.role ? "Tidak dapat mengubah role akun Anda sendiri" : null);
  if (guardError) return { success: false, error: guardError };
  if (await emailTaken(parsed.data.email, parsed.data.id)) return { success: false, error: { email: ["Email sudah terdaftar"] } };

  const data: Record<string, unknown> = {
    name: parsed.data.name,
    email: parsed.data.email,
    role: parsed.data.role,
    modifiedBy: actor.sessionId,
  };

  if (parsed.data.password && parsed.data.password.length > 0) {
    data.password = await bcrypt.hash(parsed.data.password, 10);
  }

  await prisma.user.update({ where: { id: parsed.data.id }, data });

  return { success: true };
}

export async function toggleUserActive(id: string) {
  if (!(await hasPermission("settings-users", "DELETE"))) {
    return { success: false, error: "Tidak memiliki izin untuk menonaktifkan/mengaktifkan user" };
  }

  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true, isActive: true } });
  const actor = await sessionActor();
  const guardError = userAdminScopeError(await getAccessContext()) ?? userTargetError(actor, user);
  if (guardError || !user) return { success: false, error: guardError ?? "User tidak ditemukan" };

  await prisma.user.update({
    where: { id },
    data: { isActive: !user.isActive, modifiedBy: actor.sessionId },
  });

  return { success: true };
}
