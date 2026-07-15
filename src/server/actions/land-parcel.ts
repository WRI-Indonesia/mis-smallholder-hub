"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { landParcelSchema, updateLandParcelSchema } from "@/validations/land-parcel.schema";
import type { LandParcelInput, UpdateLandParcelInput } from "@/validations/land-parcel.schema";
import { hasPermission, isSuperAdmin } from "@/lib/rbac";

import {
  getAccessContext,
  farmerAccessFilter,
  farmerRelationAccessFilter,
} from "@/lib/access-context";

export async function getLandParcels(search?: string, farmerId?: string) {
  if (!(await hasPermission("master-data-parcels", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }

  const access = await getAccessContext();

  // Soft-delete: hanya SUPERADMIN yang boleh melihat record nonaktif (badge +
  // filter Status di UI, untuk restore). User lain dibatasi ke record aktif.
  const where = {
    ...farmerRelationAccessFilter(access),
    ...((await isSuperAdmin()) ? {} : { isActive: true }),
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

  // Select ramping sesuai kolom list client — tanpa `geometry` (GeoJSON polygon
  // besar, hanya dipakai halaman detail) agar payload list tetap ringan (#163).
  return prisma.landParcel.findMany({
    where,
    select: {
      id: true,
      farmerId: true,
      parcelId: true,
      blok: true,
      subGroupLv1: true,
      subGroupLv2: true,
      area: true,
      landStatus: true,
      cropType: true,
      plantingYear: true,
      revision: true,
      isActive: true,
      notes: true,
      farmer: {
        select: {
          id: true,
          name: true,
          farmerId: true,
          farmerGroup: {
            select: {
              id: true,
              name: true,
              district: { select: { name: true } },
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

  // Scope enforced (lahan milik petani dalam jurisdiksi user). Hanya SUPERADMIN
  // yang boleh membuka detail lahan nonaktif; user lain dibatasi ke aktif.
  return prisma.landParcel.findFirst({
    where: { id, ...farmerRelationAccessFilter(access), ...((await isSuperAdmin()) ? {} : { isActive: true }) },
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

  // Pastikan petani target berada dalam scope data-access user.
  const access = await getAccessContext();
  const targetFarmer = await prisma.farmer.findFirst({
    where: { id: parsed.data.farmerId, isActive: true, ...farmerAccessFilter(access) },
    select: { id: true },
  });
  if (!targetFarmer) {
    return { success: false, error: { farmerId: ["Tidak memiliki izin untuk menambah lahan ke petani ini"] } };
  }

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

  const existing = await prisma.landParcel.findFirst({
    where: { id, isActive: true, ...farmerRelationAccessFilter(access) },
  });
  if (!existing) return { success: false, error: "Lahan tidak ditemukan atau tidak dalam akses Anda" };

  // Cegah pemindahan lahan ke petani di luar scope user.
  if (data.farmerId !== existing.farmerId) {
    const targetFarmer = await prisma.farmer.findFirst({
      where: { id: data.farmerId, isActive: true, ...farmerAccessFilter(access) },
      select: { id: true },
    });
    if (!targetFarmer) {
      return { success: false, error: { farmerId: ["Tidak memiliki izin untuk memindahkan lahan ke petani ini"] } };
    }
  }

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
      // Geometry hanya ditulis bila client mengirim field-nya (undefined = tidak
      // diubah). Payload list & form edit tidak membawa geometry (#163), jadi
      // edit dari list tidak boleh menghapus polygon existing.
      geometry: data.geometry !== undefined ? data.geometry : undefined,
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

  const existing = await prisma.landParcel.findFirst({
    where: { id, isActive: true, ...farmerRelationAccessFilter(access) },
    select: { id: true },
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

/** Toggle aktif/nonaktif lahan (restore-capable) untuk aksi baris pada list. */
export async function toggleLandParcelActive(id: string) {
  if (!(await hasPermission("master-data-parcels", "DELETE"))) {
    return { success: false, error: "Tidak memiliki izin untuk menonaktifkan/mengaktifkan lahan" };
  }

  const access = await getAccessContext();

  const existing = await prisma.landParcel.findFirst({
    where: { id, ...farmerRelationAccessFilter(access) },
    select: { isActive: true },
  });
  if (!existing) return { success: false, error: "Lahan tidak ditemukan atau tidak dalam akses Anda" };

  const session = await auth();

  await prisma.landParcel.update({
    where: { id },
    data: { isActive: !existing.isActive, modifiedBy: session?.user?.id ?? null },
  });

  return { success: true };
}
