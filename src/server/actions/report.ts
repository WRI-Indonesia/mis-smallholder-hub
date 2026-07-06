"use server";

import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { getAccessContext } from "@/lib/access-context";
import type { FarmerReportFilters, FarmerReportResult, FarmerReportRow } from "@/types/report";

export async function getDistrictsForReport() {
  if (!(await hasPermission("report-farmer", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }
  const access = await getAccessContext();

  const where: any = { isActive: true };

  if (access.mode === "BY_DISTRICT") {
    where.id = { in: access.ids };
  } else if (access.mode === "BY_FARMER_GROUP") {
    where.farmerGroups = {
      some: {
        id: { in: access.ids },
        isActive: true,
      },
    };
  }

  return prisma.district.findMany({
    where,
    orderBy: { name: "asc" },
  });
}

export async function getFarmerGroupsForReport(districtId?: string | null) {
  if (!(await hasPermission("report-farmer", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }
  const access = await getAccessContext();

  const accessFilter =
    access.mode === "BY_FARMER_GROUP" ? { id: { in: access.ids } } :
    access.mode === "BY_DISTRICT" ? { districtId: { in: access.ids } } :
    {};

  const where = {
    isActive: true,
    ...accessFilter,
    ...(districtId ? { districtId } : {}),
  };

  return prisma.farmerGroup.findMany({
    where,
    select: {
      id: true,
      name: true,
      code: true,
    },
    orderBy: { name: "asc" },
  });
}

export async function getFarmerReport(filters: FarmerReportFilters): Promise<FarmerReportResult> {
  if (!(await hasPermission("report-farmer", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }

  if (!filters.districtId || !filters.farmerGroupId) {
    throw new Error("Filter Distrik dan Kelompok Tani wajib diisi");
  }

  const access = await getAccessContext();

  const accessFilter =
    access.mode === "BY_FARMER_GROUP" ? { id: { in: access.ids } } :
    access.mode === "BY_DISTRICT" ? { districtId: { in: access.ids } } :
    {};

  // Verify group is within access boundaries
  const group = await prisma.farmerGroup.findFirst({
    where: {
      id: filters.farmerGroupId,
      districtId: filters.districtId,
      isActive: true,
      ...accessFilter,
    },
  });

  if (!group) {
    throw new Error("Kelompok Tani tidak ditemukan atau Anda tidak memiliki akses");
  }

  const farmers = await prisma.farmer.findMany({
    where: {
      isActive: true,
      farmerGroupId: filters.farmerGroupId,
    },
    select: {
      id: true,
      farmerId: true,
      name: true,
      gender: true,
      nik: true,
      joinedYear: true,
      landParcels: {
        where: { isActive: true },
        select: {
          id: true,
          area: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  let totalPersil = 0;
  let totalLuasLahan = 0;

  const rows: FarmerReportRow[] = farmers.map((f) => {
    const farmerParcelsCount = f.landParcels.length;
    const farmerAreaSum = f.landParcels.reduce((sum, p) => sum + (p.area ?? 0), 0);

    totalPersil += farmerParcelsCount;
    totalLuasLahan += farmerAreaSum;

    return {
      id: f.id,
      farmerId: f.farmerId,
      name: f.name,
      gender: f.gender,
      nik: f.nik,
      joinedYear: f.joinedYear,
      totalParcels: farmerParcelsCount,
      totalArea: parseFloat(farmerAreaSum.toFixed(2)),
    };
  });

  const totalPetani = farmers.length;
  const avgLuasLahan = totalPetani > 0 ? totalLuasLahan / totalPetani : 0;

  return {
    summary: {
      totalPetani,
      totalPersil,
      totalLuasLahan: parseFloat(totalLuasLahan.toFixed(2)),
      avgLuasLahan: parseFloat(avgLuasLahan.toFixed(2)),
    },
    rows,
  };
}
