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
