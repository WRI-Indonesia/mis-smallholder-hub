"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { getAccessContext } from "@/lib/access-context";
import { userAdminScopeError } from "@/lib/user-admin-guard";
import type { PermissionLevel } from "@prisma/client";

// ─── Query active menu items ──────────────────────────────────────────────────
export async function getMenuItemsForSelect() {
  if (!(await hasPermission("settings-users", "EDIT"))) {
    throw new Error("Tidak memiliki izin");
  }

  return prisma.menuItem.findMany({
    where: {
      isActive: true,
    },
    orderBy: [
      { order: "asc" },
      { title: "asc" },
    ],
  });
}

// ─── Get role permissions + active user overrides ──────────────────────────────
export async function getUserEffectivePermissions(userId: string) {
  if (!(await hasPermission("settings-users", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }
  const scopeError = userAdminScopeError(await getAccessContext());
  if (scopeError) throw new Error(scopeError);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user) {
    throw new Error("User tidak ditemukan");
  }

  const [rolePermissions, overrides] = await Promise.all([
    prisma.rolePermission.findMany({
      where: {
        role: user.role,
        isActive: true,
      },
      select: {
        menuKey: true,
        permission: true,
      },
    }),
    prisma.userPermissionOverride.findMany({
      where: {
        userId,
        isActive: true,
      },
      select: {
        menuKey: true,
        permission: true,
        granted: true,
      },
    }),
  ]);

  return {
    role: user.role,
    rolePermissions,
    overrides,
  };
}

// ─── Upsert override (grant/revoke) ───────────────────────────────────────────
export async function setUserMenuOverride(
  userId: string,
  menuKey: string,
  permission: PermissionLevel,
  granted: boolean
) {
  if (!(await hasPermission("settings-users", "EDIT"))) {
    return { success: false, error: "Tidak memiliki izin" };
  }

  const scopeError = userAdminScopeError(await getAccessContext());
  if (scopeError) return { success: false, error: scopeError };

  // Prevent overriding SUPERADMIN
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (targetUser?.role === "SUPERADMIN") {
    return { success: false, error: "Tidak dapat mengubah hak akses SUPERADMIN" };
  }
  // Anti-eskalasi (#386 butir 2): tak boleh memberi/mencabut override di akun sendiri.
  if ((await auth())?.user?.id === userId) {
    return { success: false, error: "Tidak dapat mengubah akses akun Anda sendiri" };
  }

  try {
    const session = await auth();
    await prisma.userPermissionOverride.upsert({
      where: {
        userId_menuKey_permission: {
          userId,
          menuKey,
          permission,
        },
      },
      update: {
        granted,
        isActive: true,
        modifiedBy: session?.user?.id ?? null,
      },
      create: {
        userId,
        menuKey,
        permission,
        granted,
        isActive: true,
        createdBy: session?.user?.id ?? null,
      },
    });
    return { success: true };
  } catch {
    return { success: false, error: "Gagal menyimpan override" };
  }
}

// ─── Remove override (revert to role default via soft delete) ──────────────────
export async function removeUserMenuOverride(
  userId: string,
  menuKey: string,
  permission: PermissionLevel
) {
  if (!(await hasPermission("settings-users", "EDIT"))) {
    return { success: false, error: "Tidak memiliki izin" };
  }

  const removeScopeError = userAdminScopeError(await getAccessContext());
  if (removeScopeError) return { success: false, error: removeScopeError };
  if ((await auth())?.user?.id === userId) {
    return { success: false, error: "Tidak dapat mengubah akses akun Anda sendiri" };
  }

  try {
    await prisma.userPermissionOverride.update({
      where: {
        userId_menuKey_permission: {
          userId,
          menuKey,
          permission,
        },
      },
      data: {
        isActive: false,
      },
    });
    return { success: true };
  } catch {
    // If record is not found or already disabled, count as success
    return { success: true };
  }
}
