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
  // Dedup per (role, menuKey, permission) — entri terakhir menang; SUPERADMIN diabaikan.
  const byKey = new Map<string, RolePermissionUpdate>();
  for (const u of updates) {
    if (u.role !== "SUPERADMIN") byKey.set(`${u.role}|${u.menuKey}|${u.permission}`, u);
  }
  const valid = [...byKey.values()];
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
