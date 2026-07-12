"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";

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

  try {
    const session = await auth();
    await prisma.userProvince.create({ data: { userId, provinceId, createdBy: session?.user?.id ?? null } });
    return { success: true };
  } catch {
    return { success: false, error: "Gagal menyimpan atau sudah terassign" };
  }
}

export async function removeUserProvince(userId: string, provinceId: string) {
  if (!(await hasPermission("settings-users", "EDIT"))) {
    return { success: false, error: "Tidak memiliki izin" };
  }

  await prisma.userProvince.deleteMany({ where: { userId, provinceId } });
  return { success: true };
}

// ─── District ─────────────────────────────────────────────────────────────────

export async function assignUserDistrict(userId: string, districtId: string) {
  if (!(await hasPermission("settings-users", "EDIT"))) {
    return { success: false, error: "Tidak memiliki izin" };
  }

  try {
    const session = await auth();
    await prisma.userDistrict.create({ data: { userId, districtId, createdBy: session?.user?.id ?? null } });
    return { success: true };
  } catch {
    return { success: false, error: "Gagal menyimpan atau sudah terassign" };
  }
}

export async function removeUserDistrict(userId: string, districtId: string) {
  if (!(await hasPermission("settings-users", "EDIT"))) {
    return { success: false, error: "Tidak memiliki izin" };
  }

  await prisma.userDistrict.deleteMany({ where: { userId, districtId } });
  return { success: true };
}

// ─── Farmer Group ─────────────────────────────────────────────────────────────

export async function assignUserFarmerGroup(userId: string, farmerGroupId: string) {
  if (!(await hasPermission("settings-users", "EDIT"))) {
    return { success: false, error: "Tidak memiliki izin" };
  }

  try {
    const session = await auth();
    await prisma.userFarmerGroup.create({ data: { userId, farmerGroupId, createdBy: session?.user?.id ?? null } });
    return { success: true };
  } catch {
    return { success: false, error: "Gagal menyimpan atau sudah terassign" };
  }
}

export async function removeUserFarmerGroup(userId: string, farmerGroupId: string) {
  if (!(await hasPermission("settings-users", "EDIT"))) {
    return { success: false, error: "Tidak memiliki izin" };
  }

  await prisma.userFarmerGroup.deleteMany({ where: { userId, farmerGroupId } });
  return { success: true };
}
