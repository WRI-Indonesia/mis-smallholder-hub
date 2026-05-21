"use server";

import { prisma } from "@/lib/prisma";
import type { Role, PermissionLevel } from "@prisma/client";

export async function getRolePermissions() {
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
) {
  const existing = await prisma.rolePermission.findFirst({
    where: { role, menuKey, permission },
  });

  if (existing) {
    // Toggle isActive
    await prisma.rolePermission.update({
      where: { id: existing.id },
      data: { isActive: !existing.isActive },
    });
    return { success: true, granted: !existing.isActive };
  }

  // Create new
  await prisma.rolePermission.create({
    data: { role, menuKey, permission },
  });
  return { success: true, granted: true };
}
