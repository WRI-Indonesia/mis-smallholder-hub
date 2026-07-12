"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { farmerSchema, updateFarmerSchema } from "@/validations/farmer.schema";
import type { FarmerInput, UpdateFarmerInput } from "@/validations/farmer.schema";
import { hasPermission, isSuperAdmin } from "@/lib/rbac";

import { getAccessContext, farmerAccessFilter, farmerGroupAccessFilter } from "@/lib/access-context";

export async function getFarmers(search?: string, farmerGroupId?: string) {
  if (!(await hasPermission("master-data-farmers", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }

  const access = await getAccessContext();

  // Soft-delete: hanya SUPERADMIN yang boleh melihat record nonaktif (badge +
  // filter Status di UI, untuk restore). User lain dibatasi ke record aktif.
  const where = {
    ...farmerAccessFilter(access),
    ...((await isSuperAdmin()) ? {} : { isActive: true }),
    ...(farmerGroupId ? { farmerGroupId } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { farmerId: { contains: search, mode: "insensitive" as const } },
            { nik: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  return prisma.farmer.findMany({
    where,
    include: {
      farmerGroup: {
        include: {
          district: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function getFarmerById(id: string) {
  if (!(await hasPermission("master-data-farmers", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }

  const access = await getAccessContext();

  // Scope enforced. Hanya SUPERADMIN yang boleh membuka detail record nonaktif;
  // user lain dibatasi ke record aktif.
  return prisma.farmer.findFirst({
    where: { id, ...farmerAccessFilter(access), ...((await isSuperAdmin()) ? {} : { isActive: true }) },
    include: {
      farmerGroup: {
        include: {
          district: true,
        },
      },
    },
  });
}

export async function createFarmer(input: FarmerInput) {
  if (!(await hasPermission("master-data-farmers", "CREATE"))) {
    return { success: false, error: "Tidak memiliki izin untuk menambah petani" };
  }

  const parsed = farmerSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

  // Pastikan kelompok tani target berada dalam scope data-access user.
  const access = await getAccessContext();
  const targetGroup = await prisma.farmerGroup.findFirst({
    // `AND` (bukan spread) agar filter scope `{ id: { in } }` pada mode
    // BY_FARMER_GROUP tidak menimpa literal `id` di atas.
    where: { id: parsed.data.farmerGroupId, isActive: true, AND: farmerGroupAccessFilter(access) },
    select: { id: true },
  });
  if (!targetGroup) {
    return { success: false, error: "Tidak memiliki izin untuk menambah petani ke kelompok tani ini" };
  }

  const session = await auth();

  await prisma.farmer.create({
    data: {
      ...parsed.data,
      createdBy: session?.user?.id ?? null,
    },
  });

  return { success: true };
}

export async function updateFarmer(input: UpdateFarmerInput) {
  if (!(await hasPermission("master-data-farmers", "EDIT"))) {
    return { success: false, error: "Tidak memiliki izin untuk mengubah petani" };
  }

  const parsed = updateFarmerSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

  const session = await auth();
  const { id, ...data } = parsed.data;

  const access = await getAccessContext();

  // Verify farmer exists, is active, and is within the user's scope before updating
  const existing = await prisma.farmer.findFirst({ where: { id, isActive: true, ...farmerAccessFilter(access) } });
  if (!existing) return { success: false, error: "Petani tidak ditemukan atau sudah tidak aktif" };

  // Cegah pemindahan petani ke kelompok tani di luar scope user.
  const targetGroup = await prisma.farmerGroup.findFirst({
    where: { id: data.farmerGroupId, isActive: true, AND: farmerGroupAccessFilter(access) },
    select: { id: true },
  });
  if (!targetGroup) {
    return { success: false, error: "Tidak memiliki izin untuk memindahkan petani ke kelompok tani ini" };
  }

  await prisma.farmer.update({
    where: { id },
    data: { ...data, modifiedBy: session?.user?.id ?? null },
  });

  return { success: true };
}

export async function toggleFarmerActive(id: string) {
  if (!(await hasPermission("master-data-farmers", "DELETE"))) {
    return { success: false, error: "Tidak memiliki izin untuk menonaktifkan/mengaktifkan petani" };
  }

  const access = await getAccessContext();

  const farmer = await prisma.farmer.findFirst({
    where: { id, ...farmerAccessFilter(access) },
    select: { isActive: true },
  });
  if (!farmer) return { success: false, error: "Petani tidak ditemukan" };

  await prisma.farmer.update({
    where: { id },
    data: { isActive: !farmer.isActive },
  });

  return { success: true };
}
