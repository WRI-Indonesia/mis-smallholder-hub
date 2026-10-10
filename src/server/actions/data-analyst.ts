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

  // Scope di AND: filter permintaan tak boleh menimpa scope (BUG-007, #386 butir 1).
  const where = {
    isActive: true,
    ...(districtId ? { districtId } : {}),
    AND: accessFilter,
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

  // Scope di AND: filter permintaan tak boleh menimpa scope (BUG-007, #386 butir 1).
  const farmerGroupWhere = {
    isActive: true,
    ...(filters.districtId    && { districtId: filters.districtId }),
    ...(filters.farmerGroupId && { id:         filters.farmerGroupId }),
    AND: accessFilter,
  };

  const farmerWhere = {
    isActive: true,
    farmerGroup: farmerGroupWhere,
  };

  // Agregat dihitung di DB (#253, performance.md §Payload Trimming): dulu satu baris
  // per lahan ditarik ke Node hanya untuk `.length` & `sum(area)` (±19.500 objek).
  // `rows` per petani tetap dibutuhkan tabel rincian, kini dengan `_count` saja.
  const [farmers, luas, groups] = await Promise.all([
    prisma.farmer.findMany({
      where: farmerWhere,
      select: {
        farmerId: true,
        name:     true,
        farmerGroup: { select: { name: true } },
        _count: { select: { landParcels: { where: { isActive: true } } } },
      },
      orderBy: [
        { farmerGroup: { name: "asc" } },
        { name: "asc" },
      ],
    }),
    prisma.landParcel.aggregate({
      where: { isActive: true, farmer: farmerWhere },
      _sum: { area: true },
    }),
    // Lembaga yang punya petani dalam scope — distinct per id di DB (dulu Set nama di JS;
    // setara selama nama Lembaga unik: 32 aktif = 32 nama, 2026-09-30).
    prisma.farmer.groupBy({ by: ["farmerGroupId"], where: farmerWhere }),
  ]);

  const distinctKT     = groups.length;
  const totalPetani    = farmers.length;
  const totalPersil    = farmers.reduce((sum, f) => sum + f._count.landParcels, 0);
  const totalLuasLahan = luas._sum.area ?? 0;

  const rows: FarmerDetailRow[] = farmers.map(f => ({
    farmerGroupName: f.farmerGroup.name,
    farmerId:        f.farmerId,
    farmerName:      f.name,
    totalParcels:    f._count.landParcels,
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

  // Scope di AND: filter permintaan tak boleh menimpa scope (BUG-007, #386 butir 1).
  const farmerGroupWhere = {
    isActive: true,
    ...(filters.districtId    && { districtId: filters.districtId }),
    ...(filters.farmerGroupId && { id:         filters.farmerGroupId }),
    AND: accessFilter,
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
