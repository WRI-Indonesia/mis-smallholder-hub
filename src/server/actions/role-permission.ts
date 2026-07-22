"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import type { Role, PermissionLevel } from "@prisma/client";
import type { ActionResult } from "@/types/action-result";

export async function getRolePermissions() {
  if (!(await hasPermission("settings-roles", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }

  return prisma.rolePermission.findMany({
    where: { isActive: true },
    select: { id: true, role: true, menuKey: true, permission: true },
    orderBy: [{ role: "asc" }, { menuKey: "asc" }],
  });
}

export async function toggleRolePermission(
  role: Role,
  menuKey: string,
  permission: PermissionLevel
): Promise<ActionResult<{ granted: boolean }>> {
  if (!(await hasPermission("settings-roles", "EDIT"))) {
    return { success: false, error: "Tidak memiliki izin untuk mengubah permission" };
  }

  // SUPERADMIN selalu memiliki akses penuh (bypass di rbac) — permission-nya tidak boleh diubah.
  if (role === "SUPERADMIN") {
    return { success: false, error: "Permission SUPERADMIN tidak dapat diubah" };
  }

  const existing = await prisma.rolePermission.findFirst({
    where: { role, menuKey, permission },
  });

  const session = await auth();

  if (existing) {
    // Toggle isActive
    await prisma.rolePermission.update({
      where: { id: existing.id },
      data: { isActive: !existing.isActive, modifiedBy: session?.user?.id ?? null },
    });
    return { success: true, data: { granted: !existing.isActive } };
  }

  // Create new
  await prisma.rolePermission.create({
    data: { role, menuKey, permission, createdBy: session?.user?.id ?? null },
  });
  return { success: true, data: { granted: true } };
}

export interface RolePermissionUpdate {
  role: Role;
  menuKey: string;
  permission: PermissionLevel;
  granted: boolean;
}

/**
 * Set banyak permission ke keadaan eksplisit dalam satu round-trip (transaksi).
 * Dipakai aksi massal matriks Role & Permission: toggle satu baris penuh dan
 * kaskade induk → anak. Entri SUPERADMIN diabaikan (bypass di RBAC).
 */
export async function setRolePermissions(
  updates: RolePermissionUpdate[]
): Promise<ActionResult<{ count: number }>> {
  if (!(await hasPermission("settings-roles", "EDIT"))) {
    return { success: false, error: "Tidak memiliki izin untuk mengubah permission" };
  }

  const session = await auth();
  const userId = session?.user?.id ?? null;
  const valid = updates.filter((u) => u.role !== "SUPERADMIN");
  if (valid.length === 0) return { success: true, data: { count: 0 } };

  await prisma.$transaction(
    async (tx) => {
      for (const u of valid) {
        const existing = await tx.rolePermission.findFirst({
          where: { role: u.role, menuKey: u.menuKey, permission: u.permission },
        });

        if (existing) {
          if (existing.isActive !== u.granted) {
            await tx.rolePermission.update({
              where: { id: existing.id },
              data: { isActive: u.granted, modifiedBy: userId },
            });
          }
        } else if (u.granted) {
          await tx.rolePermission.create({
            data: {
              role: u.role,
              menuKey: u.menuKey,
              permission: u.permission,
              createdBy: userId,
            },
          });
        }
      }
    },
    // Kaskade induk → anak bisa banyak query berurutan; longgarkan timeout.
    { timeout: 20000 }
  );

  return { success: true, data: { count: valid.length } };
}
