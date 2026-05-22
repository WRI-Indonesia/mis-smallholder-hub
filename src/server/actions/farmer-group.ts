"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { farmerGroupSchema, updateFarmerGroupSchema } from "@/validations/farmer-group.schema";
import type { FarmerGroupInput, UpdateFarmerGroupInput } from "@/validations/farmer-group.schema";
import { hasPermission } from "@/lib/rbac";

async function getAccessibleDistrictIds(): Promise<string[] | "ALL"> {
  const session = await auth();
  if (!session?.user) return [];
  if (session.user.role === "SUPERADMIN") return "ALL";

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      provinces: { include: { province: { include: { districts: true } } } },
      districts: true,
      farmerGroups: true,
    },
  });

  if (!user) return [];

  // No assignments at all → unrestricted (show all)
  if (user.provinces.length === 0 && user.districts.length === 0 && user.farmerGroups.length === 0) {
    return "ALL";
  }

  const ids = new Set<string>();
  for (const up of user.provinces) {
    for (const d of up.province.districts) ids.add(d.id);
  }
  for (const ud of user.districts) ids.add(ud.districtId);

  return [...ids];
}

export async function getFarmerGroups(search?: string) {
  if (!(await hasPermission("master-data-groups", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }

  const districtIds = await getAccessibleDistrictIds();

  const where = {
    ...(districtIds !== "ALL" ? { districtId: { in: districtIds } } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { code: { contains: search, mode: "insensitive" as const } },
            { abrv: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  return prisma.farmerGroup.findMany({
    where,
    include: { district: { select: { name: true } } },
    orderBy: { name: "asc" },
  });
}

export async function getFarmerGroupById(id: string) {
  if (!(await hasPermission("master-data-groups", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }

  return prisma.farmerGroup.findUnique({
    where: { id },
    include: { district: { select: { id: true, name: true } } },
  });
}

export async function createFarmerGroup(input: FarmerGroupInput) {
  if (!(await hasPermission("master-data-groups", "CREATE"))) {
    return { success: false, error: "Tidak memiliki izin untuk menambah kelompok tani" };
  }

  const parsed = farmerGroupSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

  const session = await auth();

  await prisma.farmerGroup.create({
    data: {
      ...parsed.data,
      createdBy: session?.user?.id ?? null,
    },
  });

  return { success: true };
}

export async function updateFarmerGroup(input: UpdateFarmerGroupInput) {
  if (!(await hasPermission("master-data-groups", "EDIT"))) {
    return { success: false, error: "Tidak memiliki izin untuk mengubah kelompok tani" };
  }

  const parsed = updateFarmerGroupSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

  const session = await auth();
  const { id, ...data } = parsed.data;

  await prisma.farmerGroup.update({
    where: { id },
    data: { ...data, modifiedBy: session?.user?.id ?? null },
  });

  return { success: true };
}

export async function toggleFarmerGroupActive(id: string) {
  if (!(await hasPermission("master-data-groups", "DELETE"))) {
    return { success: false, error: "Tidak memiliki izin untuk menonaktifkan/mengaktifkan kelompok tani" };
  }

  const group = await prisma.farmerGroup.findUnique({ where: { id }, select: { isActive: true } });
  if (!group) return { success: false, error: "Kelompok Tani tidak ditemukan" };

  await prisma.farmerGroup.update({
    where: { id },
    data: { isActive: !group.isActive },
  });

  return { success: true };
}

export async function getDistrictsForSelect() {
  return prisma.district.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}
