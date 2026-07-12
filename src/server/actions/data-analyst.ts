"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { getAccessContext } from "@/lib/access-context";
import type { AnalystFilters, FarmerDetailRow, FarmerSummaryResult, FarmerNoParcelsRow, FarmersWithoutParcelsResult } from "@/types/data-analyst";

export async function getDistrictsForAnalyst() {
  if (!(await hasPermission("data-analyst-farmer-summary", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }
  const access = await getAccessContext();

  const where: Prisma.DistrictWhereInput = { isActive: true };

  if (access.mode === "BY_DISTRICT") {
    where.id = { in: access.ids };
  } else if (access.mode === "BY_FARMER_GROUP") {
    where.farmerGroups = {
      some: {
        id: { in: access.ids },
        isActive: true
      }
    };
  }

  return prisma.district.findMany({
    where,
    orderBy: { name: "asc" }
  });
}

export async function getFarmerGroupsForAnalyst(districtId?: string | null) {
  if (!(await hasPermission("data-analyst-farmer-summary", "VIEW"))) {
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
    ...(districtId ? { districtId } : {})
  };

  return prisma.farmerGroup.findMany({
    where,
    select: {
      id: true,
      name: true,
      code: true,
    },
    orderBy: { name: "asc" }
  });
}

export async function getFarmerSummary(filters: AnalystFilters): Promise<FarmerSummaryResult> {
  if (!(await hasPermission("data-analyst-farmer-summary", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }
  const access = await getAccessContext();

  const accessFilter =
    access.mode === "BY_FARMER_GROUP" ? { id: { in: access.ids } } :
    access.mode === "BY_DISTRICT" ? { districtId: { in: access.ids } } :
    {};

  const farmerGroupWhere = {
    isActive: true,
    ...accessFilter,
    ...(filters.districtId    && { districtId: filters.districtId }),
    ...(filters.farmerGroupId && { id:         filters.farmerGroupId }),
  };

  const farmerWhere = {
    isActive: true,
    farmerGroup: farmerGroupWhere,
  };

  const farmers = await prisma.farmer.findMany({
    where: farmerWhere,
    select: {
      farmerId: true,
      name:     true,
      farmerGroup: { select: { name: true } },
      landParcels: {
        where:  { isActive: true },
        select: { area: true },
      },
    },
    orderBy: [
      { farmerGroup: { name: "asc" } },
      { name: "asc" },
    ],
  });

  const distinctKT     = new Set(farmers.map(f => f.farmerGroup.name)).size;
  const totalPetani    = farmers.length;
  const totalPersil    = farmers.reduce((sum, f) => sum + f.landParcels.length, 0);
  const totalLuasLahan = farmers.reduce(
    (sum, f) => sum + f.landParcels.reduce((s, p) => s + (p.area ?? 0), 0),
    0
  );

  const rows: FarmerDetailRow[] = farmers.map(f => ({
    farmerGroupName: f.farmerGroup.name,
    farmerId:        f.farmerId,
    farmerName:      f.name,
    totalParcels:    f.landParcels.length,
  }));

  return {
    summary: {
      totalKT: distinctKT,
      totalPetani,
      totalPersil,
      totalLuasLahan,
    },
    rows,
  };
}

export async function getFarmersWithoutParcels(filters: AnalystFilters): Promise<FarmersWithoutParcelsResult> {
  if (!(await hasPermission("data-analyst-farmer-summary", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }
  const access = await getAccessContext();

  const accessFilter =
    access.mode === "BY_FARMER_GROUP" ? { id: { in: access.ids } } :
    access.mode === "BY_DISTRICT" ? { districtId: { in: access.ids } } :
    {};

  const farmerGroupWhere = {
    isActive: true,
    ...accessFilter,
    ...(filters.districtId    && { districtId: filters.districtId }),
    ...(filters.farmerGroupId && { id:         filters.farmerGroupId }),
  };

  const farmerWhere = {
    isActive: true,
    farmerGroup: farmerGroupWhere,
  };

  const farmersWithoutParcels = await prisma.farmer.findMany({
    where: {
      ...farmerWhere,
      landParcels: { none: { isActive: true } },
    },
    select: {
      farmerId:    true,
      name:        true,
      farmerGroup: { select: { name: true } },
    },
    orderBy: [
      { farmerGroup: { name: "asc" } },
      { name: "asc" },
    ],
  });

  const totalPetaniScope = await prisma.farmer.count({ where: farmerWhere });

  const distinctKT = new Set(farmersWithoutParcels.map(f => f.farmerGroup.name)).size;
  const percentage = totalPetaniScope > 0
    ? (farmersWithoutParcels.length / totalPetaniScope) * 100
    : 0;

  const rows: FarmerNoParcelsRow[] = farmersWithoutParcels.map(f => ({
    farmerGroupName: f.farmerGroup.name,
    farmerId:        f.farmerId,
    farmerName:      f.name,
  }));

  return {
    summary: {
      totalKT: distinctKT,
      totalFarmersWithoutParcels: farmersWithoutParcels.length,
      percentageFromTotal: parseFloat(percentage.toFixed(2)),
    },
    rows,
  };
}
