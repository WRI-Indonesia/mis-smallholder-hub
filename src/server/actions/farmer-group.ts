"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { farmerGroupSchema, updateFarmerGroupSchema } from "@/validations/farmer-group.schema";
import type { FarmerGroupInput, UpdateFarmerGroupInput } from "@/validations/farmer-group.schema";
import { hasPermission, isSuperAdmin } from "@/lib/rbac";

import { getAccessContext, farmerGroupAccessFilter } from "@/lib/access-context";

export async function getFarmerGroups(search?: string) {
  if (!(await hasPermission("master-data-groups", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }

  const access = await getAccessContext();

  // Soft-delete: hanya SUPERADMIN yang boleh melihat record nonaktif (badge +
  // filter Status di UI, untuk restore). User lain dibatasi ke record aktif.
  const where = {
    ...farmerGroupAccessFilter(access),
    ...((await isSuperAdmin()) ? {} : { isActive: true }),
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

  const groups = await prisma.farmerGroup.findMany({
    where,
    include: {
      district: { select: { name: true } },
      farmers: {
        where: { isActive: true },
        select: {
          landParcels: {
            where: { isActive: true },
            select: {
              area: true,
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return groups.map((g) => {
    const farmersCount = g.farmers.length;
    const parcelsCount = g.farmers.reduce(
      (sum, f) => sum + f.landParcels.length,
      0
    );
    const totalArea = g.farmers.reduce(
      (sum, f) => sum + f.landParcels.reduce((pSum, p) => pSum + (p.area ?? 0), 0),
      0
    );

    return {
      ...g,
      farmersCount,
      parcelsCount,
      totalArea,
    };
  });
}

export async function getFarmerGroupById(id: string) {
  if (!(await hasPermission("master-data-groups", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }

  const access = await getAccessContext();

  // Scope enforced (cegah akses KT lintas wilayah via id). `AND` agar filter scope
  // `{ id: { in } }` (mode BY_FARMER_GROUP) tidak menimpa literal `id`. Hanya
  // SUPERADMIN yang boleh membuka detail KT nonaktif; user lain dibatasi ke aktif.
  return prisma.farmerGroup.findFirst({
    where: { id, AND: farmerGroupAccessFilter(access), ...((await isSuperAdmin()) ? {} : { isActive: true }) },
    include: { district: { select: { id: true, name: true } } },
  });
}

export async function createFarmerGroup(input: FarmerGroupInput) {
  if (!(await hasPermission("master-data-groups", "CREATE"))) {
    return { success: false, error: "Tidak memiliki izin untuk menambah lembaga petani" };
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
    return { success: false, error: "Tidak memiliki izin untuk mengubah lembaga petani" };
  }

  const parsed = updateFarmerGroupSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

  const session = await auth();
  const { id, ...data } = parsed.data;

  const access = await getAccessContext();

  // Verify group exists, is active, and is within the user's scope before updating
  const existing = await prisma.farmerGroup.findFirst({
    where: { id, isActive: true, AND: farmerGroupAccessFilter(access) },
    select: { id: true },
  });
  if (!existing) return { success: false, error: "Lembaga Petani tidak ditemukan atau tidak dalam akses Anda" };

  await prisma.farmerGroup.update({
    where: { id },
    data: { ...data, modifiedBy: session?.user?.id ?? null },
  });

  return { success: true };
}

export async function toggleFarmerGroupActive(id: string) {
  if (!(await hasPermission("master-data-groups", "DELETE"))) {
    return { success: false, error: "Tidak memiliki izin untuk menonaktifkan/mengaktifkan lembaga petani" };
  }

  const access = await getAccessContext();

  const group = await prisma.farmerGroup.findFirst({
    where: { id, AND: farmerGroupAccessFilter(access) },
    select: { isActive: true },
  });
  if (!group) return { success: false, error: "Lembaga Petani tidak ditemukan" };

  const session = await auth();

  await prisma.farmerGroup.update({
    where: { id },
    data: { isActive: !group.isActive, modifiedBy: session?.user?.id ?? null },
  });

  return { success: true };
}

export async function getDistrictsForSelect() {
  // Dipakai sebagai filter di halaman KT, Petani, & Pelatihan — izinkan bila
  // user punya VIEW pada salah satu menu tersebut.
  const allowed =
    (await hasPermission("master-data-groups", "VIEW")) ||
    (await hasPermission("master-data-farmers", "VIEW")) ||
    (await hasPermission("master-data-training", "VIEW"));
  if (!allowed) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }

  return prisma.district.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}
