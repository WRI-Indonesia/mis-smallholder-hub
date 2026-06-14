"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { landParcelSchema, updateLandParcelSchema } from "@/validations/land-parcel.schema";
import type { LandParcelInput, UpdateLandParcelInput } from "@/validations/land-parcel.schema";
import { hasPermission } from "@/lib/rbac";

import { getAccessContext } from "@/lib/access-context";

export async function getLandParcels(search?: string, farmerId?: string) {
  if (!(await hasPermission("master-data-parcels", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }

  const access = await getAccessContext();

  const accessFilter =
    access.mode === "BY_FARMER_GROUP" ? { farmer: { farmerGroupId: { in: access.ids } } } :
    access.mode === "BY_DISTRICT" ? { farmer: { farmerGroup: { districtId: { in: access.ids } } } } :
    {};

  const where = {
    ...accessFilter,
    isActive: true,
    ...(farmerId ? { farmerId } : {}),
    ...(search
      ? {
          OR: [
            { parcelId: { contains: search, mode: "insensitive" as const } },
            { farmer: { name: { contains: search, mode: "insensitive" as const } } },
            { farmer: { farmerId: { contains: search, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  return prisma.landParcel.findMany({
    where,
    include: {
      farmer: {
        include: {
          farmerGroup: {
            include: {
              district: true,
            },
          },
        },
      },
    },
    orderBy: { parcelId: "asc" },
  });
}

export async function getLandParcelById(id: string) {
  if (!(await hasPermission("master-data-parcels", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }

  const access = await getAccessContext();

  // Build scope filter untuk memastikan lahan milik petani dalam jurisdiksi user
  const accessFilter =
    access.mode === "BY_FARMER_GROUP" ? { farmer: { farmerGroupId: { in: access.ids } } } :
    access.mode === "BY_DISTRICT" ? { farmer: { farmerGroup: { districtId: { in: access.ids } } } } :
    {};

  return prisma.landParcel.findFirst({
    where: { id, isActive: true, ...accessFilter },
    include: {
      farmer: {
        include: {
          farmerGroup: {
            include: {
              district: true,
            },
          },
        },
      },
    },
  });
}

export async function createLandParcel(input: LandParcelInput) {
  if (!(await hasPermission("master-data-parcels", "CREATE"))) {
    return { success: false, error: "Tidak memiliki izin untuk menambah lahan" };
  }

  const parsed = landParcelSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

  const session = await auth();

  // Check unique parcelId per farmer
  const duplicate = await prisma.landParcel.findFirst({
    where: {
      farmerId: parsed.data.farmerId,
      parcelId: parsed.data.parcelId,
      isActive: true,
    },
  });
  if (duplicate) {
    return { success: false, error: { parcelId: ["ID Lahan sudah terdaftar untuk petani ini"] } };
  }

  await prisma.landParcel.create({
    data: {
      ...parsed.data,
      geometry: parsed.data.geometry ?? null,
      revision: 0,
      createdBy: session?.user?.id ?? null,
    },
  });

  return { success: true };
}

export async function updateLandParcel(input: UpdateLandParcelInput) {
  if (!(await hasPermission("master-data-parcels", "EDIT"))) {
    return { success: false, error: "Tidak memiliki izin untuk mengubah lahan" };
  }

  const parsed = updateLandParcelSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

  const session = await auth();
  const { id, ...data } = parsed.data;

  const access = await getAccessContext();

  const ownershipFilter =
    access.mode === "BY_FARMER_GROUP" ? { farmer: { farmerGroupId: { in: access.ids } } } :
    access.mode === "BY_DISTRICT" ? { farmer: { farmerGroup: { districtId: { in: access.ids } } } } :
    {};

  const existing = await prisma.landParcel.findFirst({
    where: { id, isActive: true, ...ownershipFilter },
  });
  if (!existing) return { success: false, error: "Lahan tidak ditemukan atau tidak dalam akses Anda" };

  // Check unique parcelId per farmer if parcelId or farmerId is changing
  if (data.parcelId !== existing.parcelId || data.farmerId !== existing.farmerId) {
    const duplicate = await prisma.landParcel.findFirst({
      where: {
        id: { not: id },
        farmerId: data.farmerId,
        parcelId: data.parcelId,
        isActive: true,
      },
    });
    if (duplicate) {
      return { success: false, error: { parcelId: ["ID Lahan sudah terdaftar untuk petani ini"] } };
    }
  }

  await prisma.landParcel.update({
    where: { id },
    data: {
      ...data,
      geometry: data.geometry ?? null,
      revision: existing.revision + 1,  // Auto-increment, abaikan input dari client
      modifiedBy: session?.user?.id ?? null,
    },
  });

  return { success: true };
}

export async function deleteLandParcel(id: string) {
  if (!(await hasPermission("master-data-parcels", "DELETE"))) {
    return { success: false, error: "Tidak memiliki izin untuk menonaktifkan lahan" };
  }

  const access = await getAccessContext();

  const ownershipFilter =
    access.mode === "BY_FARMER_GROUP" ? { farmer: { farmerGroupId: { in: access.ids } } } :
    access.mode === "BY_DISTRICT" ? { farmer: { farmerGroup: { districtId: { in: access.ids } } } } :
    {};

  const existing = await prisma.landParcel.findFirst({
    where: { id, ...ownershipFilter },
    select: { isActive: true },
  });
  if (!existing) return { success: false, error: "Lahan tidak ditemukan atau tidak dalam akses Anda" };

  const session = await auth();

  await prisma.landParcel.update({
    where: { id },
    data: {
      isActive: false,
      modifiedBy: session?.user?.id ?? null,
    },
  });

  return { success: true };
}

export async function getFarmersForSelect() {
  const access = await getAccessContext();

  const accessFilter =
    access.mode === "BY_FARMER_GROUP" ? { farmerGroupId: { in: access.ids } } :
    access.mode === "BY_DISTRICT" ? { farmerGroup: { districtId: { in: access.ids } } } :
    {};

  return prisma.farmer.findMany({
    where: {
      ...accessFilter,
      isActive: true,
    },
    select: { id: true, name: true, farmerId: true },
    orderBy: { name: "asc" },
  });
}
