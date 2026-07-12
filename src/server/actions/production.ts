"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { productionSchema, productionUpdateSchema } from "@/validations/production.schema";
import type { ProductionInput, ProductionUpdateInput } from "@/validations/production.schema";
import { hasPermission, isSuperAdmin } from "@/lib/rbac";
import {
  getAccessContext,
  farmerAccessFilter,
  farmerRelationAccessFilter,
} from "@/lib/access-context";

// Private helper (bukan server action / endpoint) — hanya dipakai internal oleh
// create/update yang sudah menjaga permission & scope.
async function checkDuplicateProduction(
  farmerId: string,
  period: string,
  harvestNumber: number,
  excludeId?: string
): Promise<boolean> {
  const existing = await prisma.productionRecord.findFirst({
    where: {
      farmerId,
      period,
      harvestNumber,
      isActive: true,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
  return !!existing;
}

export async function getProductionRecords(params?: {
  search?: string;
  farmerGroupId?: string;
  period?: string;
  hasParcel?: string; // "true" | "false" | "all"
  status?: string; // "active" | "inactive" | "all"
}) {
  if (!(await hasPermission("master-data-production", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }

  const access = await getAccessContext();

  // Build nested farmer filter — merge access + farmerGroupId to avoid shallow spread overwrite
  const farmerGroupFilter = params?.farmerGroupId ? { farmerGroupId: params.farmerGroupId } : {};

  const farmerFilter = {
    ...farmerAccessFilter(access),
    ...farmerGroupFilter,
  };

  // Hanya SUPERADMIN yang boleh mengakses record nonaktif; user lain dipaksa aktif.
  const isActiveFilter = !(await isSuperAdmin())
    ? { isActive: true }
    : params?.status === "active" ? { isActive: true } :
      params?.status === "inactive" ? { isActive: false } :
      params?.status === "all" ? {} :
      { isActive: true }; // default to active only

  const hasParcelFilter = 
    params?.hasParcel === "true" ? { parcelId: { not: null } } :
    params?.hasParcel === "false" ? { parcelId: null } :
    {};

  const where = {
    ...(Object.keys(farmerFilter).length > 0 ? { farmer: farmerFilter } : {}),
    ...isActiveFilter,
    ...hasParcelFilter,
    ...(params?.period ? { period: params.period } : {}),
    ...(params?.search
      ? {
          OR: [
            { farmer: { name: { contains: params.search, mode: "insensitive" as const } } },
            { farmer: { farmerId: { contains: params.search, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  return prisma.productionRecord.findMany({
    where,
    include: {
      farmer: {
        include: {
          farmerGroup: true,
        },
      },
      parcel: true,
    },
    orderBy: [
      { period: "desc" },
      { harvestDate: "desc" },
    ],
  });
}

export async function getProductionRecordById(id: string) {
  if (!(await hasPermission("master-data-production", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }

  const access = await getAccessContext();

  // Scope enforced. Hanya SUPERADMIN yang boleh membuka detail record nonaktif;
  // user lain dibatasi ke record aktif.
  return prisma.productionRecord.findFirst({
    where: {
      id,
      ...farmerRelationAccessFilter(access),
      ...((await isSuperAdmin()) ? {} : { isActive: true }),
    },
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
      parcel: true,
    },
  });
}

export async function createProductionRecord(input: ProductionInput) {
  if (!(await hasPermission("master-data-production", "CREATE"))) {
    return { success: false, error: "Tidak memiliki izin untuk menambah data produksi" };
  }

  const parsed = productionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors };
  }

  const session = await auth();

  // Validate farmer exists & active
  const farmer = await prisma.farmer.findFirst({
    where: { id: parsed.data.farmerId, isActive: true },
    include: { farmerGroup: true }
  });
  if (!farmer) {
    return { success: false, error: { farmerId: ["Petani tidak ditemukan atau tidak aktif"] } };
  }

  // Validate user access to farmer
  const access = await getAccessContext();
  if (access.mode === "BY_FARMER_GROUP" && !access.ids.includes(farmer.farmerGroupId)) {
    return { success: false, error: "Anda tidak memiliki akses ke petani ini" };
  }
  if (access.mode === "BY_DISTRICT" && !access.ids.includes(farmer.farmerGroup.districtId)) {
    return { success: false, error: "Anda tidak memiliki akses ke petani ini" };
  }

  // Validate parcel (if provided)
  if (parsed.data.parcelId) {
    const parcel = await prisma.landParcel.findFirst({
      where: { id: parsed.data.parcelId, isActive: true }
    });
    if (!parcel) {
      return { success: false, error: { parcelId: ["Lahan tidak ditemukan atau tidak aktif"] } };
    }
    if (parcel.farmerId !== parsed.data.farmerId) {
      return { success: false, error: { parcelId: ["Lahan tidak dimiliki oleh petani ini"] } };
    }
  }

  // Validate duplicate
  const duplicate = await checkDuplicateProduction(
    parsed.data.farmerId,
    parsed.data.period,
    parsed.data.harvestNumber
  );
  if (duplicate) {
    return {
      success: false,
      error: `Data panen ke-${parsed.data.harvestNumber} untuk periode ${parsed.data.period} sudah terdaftar`,
    };
  }

  // Create
  const record = await prisma.productionRecord.create({
    data: {
      ...parsed.data,
      createdBy: session?.user?.id ?? null,
    },
  });

  return { success: true, id: record.id };
}

export async function updateProductionRecord(id: string, input: ProductionUpdateInput) {
  if (!(await hasPermission("master-data-production", "EDIT"))) {
    return { success: false, error: "Tidak memiliki izin untuk mengubah data produksi" };
  }

  const parsed = productionUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors };
  }

  const session = await auth();

  const access = await getAccessContext();

  const existing = await prisma.productionRecord.findFirst({
    where: { id, isActive: true, ...farmerRelationAccessFilter(access) },
  });
  if (!existing) {
    return { success: false, error: "Data produksi tidak ditemukan atau tidak dalam akses Anda" };
  }

  const data = parsed.data;

  // Validate parcel if changing
  if (data.parcelId) {
    const parcel = await prisma.landParcel.findFirst({
      where: { id: data.parcelId, isActive: true }
    });
    if (!parcel) {
      return { success: false, error: { parcelId: ["Lahan tidak ditemukan atau tidak aktif"] } };
    }
    if (parcel.farmerId !== existing.farmerId) {
      return { success: false, error: { parcelId: ["Lahan tidak dimiliki oleh petani ini"] } };
    }
  }

  // Validate duplicate if period or harvestNumber changed
  if (data.period !== undefined || data.harvestNumber !== undefined) {
    const newPeriod = data.period ?? existing.period;
    const newHarvestNumber = data.harvestNumber ?? existing.harvestNumber;

    const duplicate = await checkDuplicateProduction(
      existing.farmerId,
      newPeriod,
      newHarvestNumber,
      id
    );
    if (duplicate) {
      return {
        success: false,
        error: `Data panen ke-${newHarvestNumber} untuk periode ${newPeriod} sudah terdaftar`,
      };
    }
  }

  // Validate date is in period after update
  if (data.harvestDate || data.period) {
    const period = data.period ?? existing.period;
    const date = data.harvestDate ?? existing.harvestDate;
    const [year, month] = period.split("-").map(Number);
    const harvestMonth = date.getMonth() + 1;
    const harvestYear = date.getFullYear();
    if (harvestYear !== year || harvestMonth !== month) {
      return {
        success: false,
        error: { harvestDate: ["Tanggal panen harus dalam periode bulan yang dipilih"] }
      };
    }
  }

  // Update
  await prisma.productionRecord.update({
    where: { id },
    data: {
      ...data,
      modifiedBy: session?.user?.id ?? null,
    },
  });

  return { success: true };
}

export async function deleteProductionRecord(id: string) {
  if (!(await hasPermission("master-data-production", "DELETE"))) {
    return { success: false, error: "Tidak memiliki izin untuk menonaktifkan data produksi" };
  }

  const access = await getAccessContext();

  const existing = await prisma.productionRecord.findFirst({
    where: { id, isActive: true, ...farmerRelationAccessFilter(access) },
  });
  if (!existing) {
    return { success: false, error: "Data produksi tidak ditemukan atau tidak dalam akses Anda" };
  }

  const session = await auth();

  await prisma.productionRecord.update({
    where: { id },
    data: {
      isActive: false,
      modifiedBy: session?.user?.id ?? null,
    },
  });

  return { success: true };
}

/** Toggle aktif/nonaktif data produksi (restore-capable) untuk aksi baris pada list. */
export async function toggleProductionRecordActive(id: string) {
  if (!(await hasPermission("master-data-production", "DELETE"))) {
    return { success: false, error: "Tidak memiliki izin untuk menonaktifkan/mengaktifkan data produksi" };
  }

  const access = await getAccessContext();

  const existing = await prisma.productionRecord.findFirst({
    where: { id, ...farmerRelationAccessFilter(access) },
    select: { isActive: true },
  });
  if (!existing) {
    return { success: false, error: "Data produksi tidak ditemukan atau tidak dalam akses Anda" };
  }

  const session = await auth();

  await prisma.productionRecord.update({
    where: { id },
    data: { isActive: !existing.isActive, modifiedBy: session?.user?.id ?? null },
  });

  return { success: true };
}

export async function getFarmerParcels(farmerId: string) {
  if (!(await hasPermission("master-data-production", "VIEW"))) {
    return [];
  }

  // Validate user has access to this farmer
  const access = await getAccessContext();
  const farmer = await prisma.farmer.findFirst({
    where: { id: farmerId, isActive: true, ...farmerAccessFilter(access) },
  });
  if (!farmer) return [];

  return prisma.landParcel.findMany({
    where: {
      farmerId,
      isActive: true,
    },
    select: { id: true, parcelId: true, area: true },
    orderBy: { parcelId: "asc" },
  });
}

export async function getAuditUserNames(createdBy: string | null, modifiedBy: string | null) {
  if (!(await hasPermission("master-data-production", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }

  let createdByName = "System/Seed";
  let modifiedByName = "System/Seed";

  const userIds = [createdBy, modifiedBy].filter((id): id is string => !!id);
  if (userIds.length === 0) return { createdByName, modifiedByName };

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true },
  });

  const userMap = new Map(users.map((u) => [u.id, u.name]));
  if (createdBy && userMap.has(createdBy)) createdByName = userMap.get(createdBy)!;
  if (modifiedBy && userMap.has(modifiedBy)) modifiedByName = userMap.get(modifiedBy)!;

  return { createdByName, modifiedByName };
}
