"use server";

import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import type { PermissionLevel } from "@prisma/client";

// ─── Query overrides for a single user ────────────────────────────────────────
export async function getUserMenuOverrides(userId: string) {
  if (!(await hasPermission("settings-users", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }

  return prisma.userPermissionOverride.findMany({
    where: {
      userId,
      isActive: true,
    },
    include: {
      menu: true,
    },
  });
}

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

  // Prevent overriding SUPERADMIN
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (targetUser?.role === "SUPERADMIN") {
    return { success: false, error: "Tidak dapat mengubah hak akses SUPERADMIN" };
  }

  try {
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
      },
      create: {
        userId,
        menuKey,
        permission,
        granted,
        isActive: true,
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
