"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import type { Role, PermissionLevel } from "@prisma/client";
import type { ActionResult } from "@/types/action-result";
import { normalizeRolePermissionUpdates, type RolePermissionUpdate } from "@/lib/role-permission-updates";

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

export type { RolePermissionUpdate };

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
  const valid = normalizeRolePermissionUpdates(updates);
  if (valid.length === 0) return { success: true, data: { count: 0 } };

  // Batch (#246): satu findMany + updateMany aktif/nonaktif + createMany — bukan
  // round-trip per update, supaya kaskade preset besar tidak mendekati timeout transaksi.
  await prisma.$transaction(async (tx) => {
    const existing = await tx.rolePermission.findMany({
      where: { OR: valid.map((u) => ({ role: u.role, menuKey: u.menuKey, permission: u.permission })) },
      select: { id: true, role: true, menuKey: true, permission: true, isActive: true },
    });
    const existingByKey = new Map(
      existing.map((e) => [`${e.role}|${e.menuKey}|${e.permission}`, e])
    );

    const toActivate: string[] = [];
    const toDeactivate: string[] = [];
    const toCreate: { role: Role; menuKey: string; permission: PermissionLevel; createdBy: string | null }[] = [];
    for (const u of valid) {
      const e = existingByKey.get(`${u.role}|${u.menuKey}|${u.permission}`);
      if (e) {
        if (e.isActive !== u.granted) (u.granted ? toActivate : toDeactivate).push(e.id);
      } else if (u.granted) {
        toCreate.push({ role: u.role, menuKey: u.menuKey, permission: u.permission, createdBy: userId });
      }
    }

    if (toActivate.length > 0) {
      await tx.rolePermission.updateMany({
        where: { id: { in: toActivate } },
        data: { isActive: true, modifiedBy: userId },
      });
    }
    if (toDeactivate.length > 0) {
      await tx.rolePermission.updateMany({
        where: { id: { in: toDeactivate } },
        data: { isActive: false, modifiedBy: userId },
      });
    }
    if (toCreate.length > 0) {
      await tx.rolePermission.createMany({ data: toCreate });
    }
  });

  return { success: true, data: { count: valid.length } };
}
