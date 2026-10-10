"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { getAccessContext } from "@/lib/access-context";
import { canGrantDataAccess, userTargetError, type DataAccessGrant } from "@/lib/user-admin-guard";

/**
 * Anti-eskalasi penugasan (#386 butir 2): akun sendiri & akun SUPERADMIN (bagi non-
 * SUPERADMIN) terkunci; wilayah/Lembaga hanya dalam scope pemanggil; pemanggil ber-scope
 * tak boleh mencabut penugasan terakhir (akun tanpa penugasan = akses SEMUA data).
 * Mengembalikan `{ error }` bila ditolak, atau `{ actorId }` bila boleh.
 */
async function guardDataAccessChange(userId: string, grant: DataAccessGrant | null, removing: boolean): Promise<{ error: string } | { actorId: string | null }> {
  if (!grant) return { error: "Lembaga Petani tidak ditemukan" };
  const session = await auth();
  const actor = { id: session?.user?.id ?? "", role: session?.user?.role ?? "" };
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
  const targetError = userTargetError(actor, target);
  if (targetError) return { error: targetError };
  const access = await getAccessContext();
  if (!canGrantDataAccess(access, grant)) return { error: "Wilayah atau Lembaga di luar akses Anda" };
  if (removing && access.mode !== "ALL") {
    const [p, d, g] = await Promise.all([
      prisma.userProvince.count({ where: { userId } }),
      prisma.userDistrict.count({ where: { userId } }),
      prisma.userFarmerGroup.count({ where: { userId } }),
    ]);
    if (p + d + g <= 1) return { error: "Tidak dapat mencabut penugasan terakhir — akun tanpa penugasan dapat melihat semua data" };
  }
  return { actorId: session?.user?.id ?? null };
}

async function groupGrant(farmerGroupId: string): Promise<DataAccessGrant | null> {
  const group = await prisma.farmerGroup.findUnique({ where: { id: farmerGroupId }, select: { districtId: true } });
  return group ? { kind: "group", groupId: farmerGroupId, districtId: group.districtId } : null;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getUserDataAccess(userId: string) {
  if (!(await hasPermission("settings-users", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }

  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      provinces: {
        select: { provinceId: true, province: { select: { id: true, name: true } } },
      },
      districts: {
        select: { districtId: true, district: { select: { id: true, name: true } } },
      },
      farmerGroups: {
        select: { farmerGroupId: true, farmerGroup: { select: { id: true, name: true, abrv: true } } },
      },
    },
  });
}

export async function getRegionsForSelect() {
  if (!(await hasPermission("settings-users", "EDIT"))) {
    throw new Error("Tidak memiliki izin");
  }

  const [provinces, districts, farmerGroups] = await Promise.all([
    prisma.province.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.district.findMany({
      where: { isActive: true },
      select: { id: true, name: true, province: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.farmerGroup.findMany({
      where: { isActive: true },
      select: { id: true, name: true, abrv: true, district: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  return { provinces, districts, farmerGroups };
}

// ─── Province ─────────────────────────────────────────────────────────────────

export async function assignUserProvince(userId: string, provinceId: string) {
  if (!(await hasPermission("settings-users", "EDIT"))) {
    return { success: false, error: "Tidak memiliki izin" };
  }

  const guard = await guardDataAccessChange(userId, { kind: "province" }, false);
  if ("error" in guard) return { success: false, error: guard.error };

  try {
    await prisma.userProvince.create({ data: { userId, provinceId, createdBy: guard.actorId } });
    return { success: true };
  } catch {
    return { success: false, error: "Gagal menyimpan atau sudah terassign" };
  }
}

export async function removeUserProvince(userId: string, provinceId: string) {
  if (!(await hasPermission("settings-users", "EDIT"))) {
    return { success: false, error: "Tidak memiliki izin" };
  }

  const guard = await guardDataAccessChange(userId, { kind: "province" }, true);
  if ("error" in guard) return { success: false, error: guard.error };

  await prisma.userProvince.deleteMany({ where: { userId, provinceId } });
  return { success: true };
}

// ─── District ─────────────────────────────────────────────────────────────────

export async function assignUserDistrict(userId: string, districtId: string) {
  if (!(await hasPermission("settings-users", "EDIT"))) {
    return { success: false, error: "Tidak memiliki izin" };
  }

  const guard = await guardDataAccessChange(userId, { kind: "district", districtId }, false);
  if ("error" in guard) return { success: false, error: guard.error };

  try {
    await prisma.userDistrict.create({ data: { userId, districtId, createdBy: guard.actorId } });
    return { success: true };
  } catch {
    return { success: false, error: "Gagal menyimpan atau sudah terassign" };
  }
}

export async function removeUserDistrict(userId: string, districtId: string) {
  if (!(await hasPermission("settings-users", "EDIT"))) {
    return { success: false, error: "Tidak memiliki izin" };
  }

  const guard = await guardDataAccessChange(userId, { kind: "district", districtId }, true);
  if ("error" in guard) return { success: false, error: guard.error };

  await prisma.userDistrict.deleteMany({ where: { userId, districtId } });
  return { success: true };
}

// ─── Farmer Group ─────────────────────────────────────────────────────────────

export async function assignUserFarmerGroup(userId: string, farmerGroupId: string) {
  if (!(await hasPermission("settings-users", "EDIT"))) {
    return { success: false, error: "Tidak memiliki izin" };
  }

  const guard = await guardDataAccessChange(userId, await groupGrant(farmerGroupId), false);
  if ("error" in guard) return { success: false, error: guard.error };

  try {
    await prisma.userFarmerGroup.create({ data: { userId, farmerGroupId, createdBy: guard.actorId } });
    return { success: true };
  } catch {
    return { success: false, error: "Gagal menyimpan atau sudah terassign" };
  }
}

export async function removeUserFarmerGroup(userId: string, farmerGroupId: string) {
  if (!(await hasPermission("settings-users", "EDIT"))) {
    return { success: false, error: "Tidak memiliki izin" };
  }

  const guard = await guardDataAccessChange(userId, await groupGrant(farmerGroupId), true);
  if ("error" in guard) return { success: false, error: guard.error };

  await prisma.userFarmerGroup.deleteMany({ where: { userId, farmerGroupId } });
  return { success: true };
}
