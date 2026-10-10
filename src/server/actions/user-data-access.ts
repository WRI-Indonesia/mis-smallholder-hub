"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { getAccessContext } from "@/lib/access-context";
import { userAdminScopeError, userTargetError } from "@/lib/user-admin-guard";

/**
 * Anti-eskalasi penugasan (#386 butir 2): hanya pemanggil tanpa batasan wilayah;
 * akun sendiri & akun SUPERADMIN (bagi non-SUPERADMIN) terkunci. Saat memberi,
 * wilayah/Lembaga tujuan harus ada & aktif. `{ error }` = ditolak, `{ actorId }` = boleh.
 */
async function guardDataAccessChange(userId: string, targetExists?: () => Promise<boolean>): Promise<{ error: string } | { actorId: string | null }> {
  const scopeError = userAdminScopeError(await getAccessContext());
  if (scopeError) return { error: scopeError };
  const session = await auth();
  const actor = { id: session?.user?.id ?? "", role: session?.user?.role ?? "" };
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
  const targetError = userTargetError(actor, target);
  if (targetError) return { error: targetError };
  if (targetExists && !(await targetExists())) return { error: "Wilayah atau Lembaga tidak ditemukan atau nonaktif" };
  return { actorId: session?.user?.id ?? null };
}

async function requireUserAdminScope() {
  const scopeError = userAdminScopeError(await getAccessContext());
  if (scopeError) throw new Error(scopeError);
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getUserDataAccess(userId: string) {
  if (!(await hasPermission("settings-users", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }
  await requireUserAdminScope();

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
  await requireUserAdminScope();

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

  const guard = await guardDataAccessChange(userId, () => prisma.province.findFirst({ where: { id: provinceId, isActive: true }, select: { id: true } }).then(Boolean));
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

  const guard = await guardDataAccessChange(userId);
  if ("error" in guard) return { success: false, error: guard.error };

  await prisma.userProvince.deleteMany({ where: { userId, provinceId } });
  return { success: true };
}

// ─── District ─────────────────────────────────────────────────────────────────

export async function assignUserDistrict(userId: string, districtId: string) {
  if (!(await hasPermission("settings-users", "EDIT"))) {
    return { success: false, error: "Tidak memiliki izin" };
  }

  const guard = await guardDataAccessChange(userId, () => prisma.district.findFirst({ where: { id: districtId, isActive: true }, select: { id: true } }).then(Boolean));
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

  const guard = await guardDataAccessChange(userId);
  if ("error" in guard) return { success: false, error: guard.error };

  await prisma.userDistrict.deleteMany({ where: { userId, districtId } });
  return { success: true };
}

// ─── Farmer Group ─────────────────────────────────────────────────────────────

export async function assignUserFarmerGroup(userId: string, farmerGroupId: string) {
  if (!(await hasPermission("settings-users", "EDIT"))) {
    return { success: false, error: "Tidak memiliki izin" };
  }

  const guard = await guardDataAccessChange(userId, () => prisma.farmerGroup.findFirst({ where: { id: farmerGroupId, isActive: true }, select: { id: true } }).then(Boolean));
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

  const guard = await guardDataAccessChange(userId);
  if ("error" in guard) return { success: false, error: guard.error };

  await prisma.userFarmerGroup.deleteMany({ where: { userId, farmerGroupId } });
  return { success: true };
}
