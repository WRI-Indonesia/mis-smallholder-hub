"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { farmerSchema, updateFarmerSchema } from "@/validations/farmer.schema";
import type { FarmerInput, UpdateFarmerInput } from "@/validations/farmer.schema";
import { hasPermission } from "@/lib/rbac";

type AccessContext =
  | { mode: "ALL" }
  | { mode: "BY_FARMER_GROUP"; ids: string[] }
  | { mode: "BY_DISTRICT"; ids: string[] };

async function getAccessContext(): Promise<AccessContext> {
  const session = await auth();
  if (!session?.user) return { mode: "BY_DISTRICT", ids: [] };
  if (session.user.role === "SUPERADMIN") return { mode: "ALL" };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      provinces: { include: { province: { include: { districts: true } } } },
      districts: true,
      farmerGroups: true,
    },
  });

  if (!user) return { mode: "BY_DISTRICT", ids: [] };

  // No assignments at all → unrestricted (show all)
  if (user.provinces.length === 0 && user.districts.length === 0 && user.farmerGroups.length === 0) {
    return { mode: "ALL" };
  }

  // FarmerGroup-only assignment → filter by specific KT IDs
  if (user.farmerGroups.length > 0 && user.provinces.length === 0 && user.districts.length === 0) {
    return { mode: "BY_FARMER_GROUP", ids: user.farmerGroups.map((f) => f.farmerGroupId) };
  }

  // Province/District assignment → resolve to district IDs
  const ids = new Set<string>();
  for (const up of user.provinces) {
    for (const d of up.province.districts) ids.add(d.id);
  }
  for (const ud of user.districts) ids.add(ud.districtId);

  return { mode: "BY_DISTRICT", ids: [...ids] };
}

export async function getFarmers(search?: string, farmerGroupId?: string) {
  if (!(await hasPermission("master-data-farmers", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }

  const access = await getAccessContext();

  const accessFilter =
    access.mode === "BY_FARMER_GROUP" ? { farmerGroupId: { in: access.ids } } :
    access.mode === "BY_DISTRICT" ? { farmerGroup: { districtId: { in: access.ids } } } :
    {};

  const where = {
    ...accessFilter,
    isActive: true, // Only show active farmers (soft-delete rule)
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

  return prisma.farmer.findUnique({
    where: { id, isActive: true },
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

  // Verify farmer exists and is active before updating
  const existing = await prisma.farmer.findUnique({ where: { id, isActive: true } });
  if (!existing) return { success: false, error: "Petani tidak ditemukan atau sudah tidak aktif" };

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

  const farmer = await prisma.farmer.findUnique({ where: { id }, select: { isActive: true } });
  if (!farmer) return { success: false, error: "Petani tidak ditemukan" };

  await prisma.farmer.update({
    where: { id },
    data: { isActive: !farmer.isActive },
  });

  return { success: true };
}

export async function getFarmerGroupsForSelect() {
  const access = await getAccessContext();

  const accessFilter =
    access.mode === "BY_FARMER_GROUP" ? { id: { in: access.ids } } :
    access.mode === "BY_DISTRICT" ? { districtId: { in: access.ids } } :
    {};

  return prisma.farmerGroup.findMany({
    where: {
      ...accessFilter,
      isActive: true,
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}
