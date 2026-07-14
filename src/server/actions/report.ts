"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { getAccessContext, farmerRelationAccessFilter } from "@/lib/access-context";
import type {
  FarmerReportFilters,
  FarmerReportResult,
  FarmerReportRow,
  TrainingReportFilters,
  TrainingReportResult,
  ProductionReportFilters,
  ProductionReportResult,
  KelompokTaniReportFilters,
  KelompokTaniReportResult,
  KelompokTaniDetailReportResult,
} from "@/types/report";
import {
  enumeratePeriods,
  buildProductionMatrix,
  isValidPeriod,
  PRODUCTION_REPORT_MAX_MONTHS,
  type ProductionMatrixRecord,
} from "@/lib/report-production";
import { buildKelompokTaniReport, type KtRawParcel } from "@/lib/report-kelompok-tani";
import { buildKelompokTaniDetailReport, type KtDetailRawParcel } from "@/lib/report-kelompok-tani-detail";

export async function getDistrictsForReport() {
  if (!(await hasPermission("report-farmer", "VIEW"))) {
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
    throw new Error("Filter Distrik dan Lembaga Petani wajib diisi");
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
    throw new Error("Lembaga Petani tidak ditemukan atau Anda tidak memiliki akses");
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

export async function getDistrictsForTrainingReport() {
  if (!(await hasPermission("report-training", "VIEW"))) {
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
        isActive: true,
      },
    };
  }

  return prisma.district.findMany({
    where,
    orderBy: { name: "asc" },
  });
}

export async function getFarmerGroupsForTrainingReport(districtId?: string | null) {
  if (!(await hasPermission("report-training", "VIEW"))) {
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

export async function getTrainingReport(filters: TrainingReportFilters): Promise<TrainingReportResult> {
  if (!(await hasPermission("report-training", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }

  if (!filters.districtId || !filters.farmerGroupId) {
    throw new Error("Filter Distrik dan Lembaga Petani wajib diisi");
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
    throw new Error("Lembaga Petani tidak ditemukan atau Anda tidak memiliki akses");
  }

  // Retrieve active training activities in this group, excluding package code 'OTHER'
  const activities = await prisma.trainingActivity.findMany({
    where: {
      isActive: true,
      farmerGroupId: filters.farmerGroupId,
      package: {
        code: {
          not: "OTHER",
        },
      },
    },
    include: {
      package: true,
      participants: {
        where: { isActive: true },
        select: {
          farmerId: true,
          preTestScore: true,
          postTestScore: true,
        },
      },
    },
    orderBy: { trainingDate: "asc" },
  });

  // Retrieve all active farmers in this group
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
    },
    orderBy: { name: "asc" },
  });

  // Calculate package participation maps with date
  const farmerPackageDateMap = new Map<string, Map<string, string>>(); // farmerId -> Map<packageCode, dateString>
  activities.forEach((act) => {
    act.participants.forEach((p) => {
      if (!farmerPackageDateMap.has(p.farmerId)) {
        farmerPackageDateMap.set(p.farmerId, new Map());
      }
      const pMap = farmerPackageDateMap.get(p.farmerId)!;
      if (!pMap.has(act.package.code)) {
        pMap.set(act.package.code, act.trainingDate.toISOString());
      }
    });
  });

  const farmerMap = new Map(farmers.map((f) => [f.id, f]));

  // Formatted activity rows for Tab 1
  const activityRows = activities.map((act) => {
    const activityParticipants = act.participants.map((p) => {
      const f = farmerMap.get(p.farmerId);
      return {
        farmerId: p.farmerId,
        farmerIdCode: f?.farmerId ?? "—",
        name: f?.name ?? "—",
        preTestScore: p.preTestScore,
        postTestScore: p.postTestScore,
      };
    });

    return {
      id: act.id,
      packageName: act.package.name,
      packageCode: act.package.code,
      trainingDate: act.trainingDate.toISOString(),
      location: act.location,
      totalParticipants: act.participants.length,
      participants: activityParticipants,
    };
  });

  // Formatted farmer rows for Tab 2
  const farmerRows = farmers.map((f) => {
    const dates = farmerPackageDateMap.get(f.id);
    return {
      id: f.id,
      farmerId: f.farmerId,
      name: f.name,
      gender: f.gender,
      paket1Date: dates?.get("PAKET_1_BMP_PC_RSPO_NKT") ?? null,
      paket2MKDate: dates?.get("PAKET_2_MK") ?? null,
      paket2K3Date: dates?.get("PAKET_2_K3") ?? null,
      paket34Date: dates?.get("PAKET_3_4_GEDSI_FINANCIAL_LIVELIHOOD_BUSDEV") ?? null,
    };
  });

  // Unique participant counts across ALL training activities (excluding OTHER)
  const uniqueParticipantsSet = new Set<string>();
  activities.forEach((act) => {
    act.participants.forEach((p) => {
      uniqueParticipantsSet.add(p.farmerId);
    });
  });

  // Package coverage (unique farmers completed specific packages)
  let totalUnikPaket1 = 0;
  let totalUnikPaket2MK = 0;
  let totalUnikPaket2K3 = 0;
  let totalUnikPaket34 = 0;

  farmers.forEach((f) => {
    const dates = farmerPackageDateMap.get(f.id);
    if (dates?.has("PAKET_1_BMP_PC_RSPO_NKT")) {
      totalUnikPaket1++;
    }
    if (dates?.has("PAKET_2_MK")) {
      totalUnikPaket2MK++;
    }
    if (dates?.has("PAKET_2_K3")) {
      totalUnikPaket2K3++;
    }
    if (dates?.has("PAKET_3_4_GEDSI_FINANCIAL_LIVELIHOOD_BUSDEV")) {
      totalUnikPaket34++;
    }
  });

  const totalPetani = farmers.length;
  const totalKegiatan = activities.length;
  const totalPeserta = activities.reduce((sum, act) => sum + act.participants.length, 0);
  const totalPesertaUnik = uniqueParticipantsSet.size;

  const pctPaket1 = totalPetani > 0 ? parseFloat(((totalUnikPaket1 / totalPetani) * 100).toFixed(2)) : 0;
  const pctPaket2MK = totalPetani > 0 ? parseFloat(((totalUnikPaket2MK / totalPetani) * 100).toFixed(2)) : 0;
  const pctPaket2K3 = totalPetani > 0 ? parseFloat(((totalUnikPaket2K3 / totalPetani) * 100).toFixed(2)) : 0;
  const pctPaket34 = totalPetani > 0 ? parseFloat(((totalUnikPaket34 / totalPetani) * 100).toFixed(2)) : 0;

  return {
    summary: {
      totalPetani,
      totalKegiatan,
      totalPeserta,
      totalPesertaUnik,
      totalUnikPaket1,
      pctPaket1,
      totalUnikPaket2MK,
      pctPaket2MK,
      totalUnikPaket2K3,
      pctPaket2K3,
      totalUnikPaket34,
      pctPaket34,
    },
    activities: activityRows,
    farmers: farmerRows,
  };
}

export async function getDistrictsForProductionReport() {
  if (!(await hasPermission("report-production", "VIEW"))) {
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
        isActive: true,
      },
    };
  }

  return prisma.district.findMany({
    where,
    orderBy: { name: "asc" },
  });
}

export async function getFarmerGroupsForProductionReport(districtId?: string | null) {
  if (!(await hasPermission("report-production", "VIEW"))) {
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

export async function getProductionReport(filters: ProductionReportFilters): Promise<ProductionReportResult> {
  if (!(await hasPermission("report-production", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }

  if (!filters.districtId || !filters.farmerGroupId) {
    throw new Error("Filter Distrik dan Lembaga Petani wajib diisi");
  }

  if (!isValidPeriod(filters.periodStart) || !isValidPeriod(filters.periodEnd)) {
    throw new Error("Periode Awal dan Periode Akhir wajib diisi dengan format bulan yang benar");
  }

  const periods = enumeratePeriods(filters.periodStart, filters.periodEnd);
  if (periods.length === 0) {
    throw new Error("Periode Akhir harus sama dengan atau setelah Periode Awal");
  }
  if (periods.length > PRODUCTION_REPORT_MAX_MONTHS) {
    throw new Error(`Rentang periode maksimal ${PRODUCTION_REPORT_MAX_MONTHS} bulan`);
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
    throw new Error("Lembaga Petani tidak ditemukan atau Anda tidak memiliki akses");
  }

  // Single query: all active production records in the group within the range.
  // period is stored zero-padded YYYY-MM, so string comparison is chronological.
  const records = await prisma.productionRecord.findMany({
    where: {
      isActive: true,
      period: { gte: filters.periodStart, lte: filters.periodEnd },
      farmer: {
        isActive: true,
        farmerGroupId: filters.farmerGroupId,
      },
    },
    select: {
      period: true,
      yieldKg: true,
      farmer: {
        select: { id: true, farmerId: true, name: true },
      },
      parcel: {
        select: { id: true, parcelId: true, area: true },
      },
    },
  });

  const matrixRecords: ProductionMatrixRecord[] = records.map((r) => ({
    farmerDbId: r.farmer.id,
    farmerCode: r.farmer.farmerId,
    farmerName: r.farmer.name,
    parcelDbId: r.parcel?.id ?? null,
    parcelCode: r.parcel?.parcelId ?? null,
    parcelArea: r.parcel?.area ?? null,
    period: r.period,
    yieldKg: r.yieldKg,
  }));

  return buildProductionMatrix(matrixRecords, periods);
}

// ─── Report Kelompok Tani (#154) — agregat KT/Gapoktan turunan dari lahan (real-time) ───

/** Dropdown Distrik/Lembaga dipakai bersama Report KT Summary & Detail. */
async function canViewKtReportFamily() {
  return (
    (await hasPermission("report-kelompok-tani", "VIEW")) ||
    (await hasPermission("report-kelompok-tani-detail", "VIEW"))
  );
}

export async function getDistrictsForKtReport() {
  if (!(await canViewKtReportFamily())) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }
  const access = await getAccessContext();

  const where: Prisma.DistrictWhereInput = { isActive: true };
  if (access.mode === "BY_DISTRICT") {
    where.id = { in: access.ids };
  } else if (access.mode === "BY_FARMER_GROUP") {
    where.farmerGroups = { some: { id: { in: access.ids }, isActive: true } };
  }

  return prisma.district.findMany({ where, orderBy: { name: "asc" } });
}

export async function getFarmerGroupsForKtReport(districtId?: string | null) {
  if (!(await canViewKtReportFamily())) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }
  const access = await getAccessContext();

  const accessFilter =
    access.mode === "BY_FARMER_GROUP" ? { id: { in: access.ids } } :
    access.mode === "BY_DISTRICT" ? { districtId: { in: access.ids } } :
    {};

  return prisma.farmerGroup.findMany({
    where: { isActive: true, ...accessFilter, ...(districtId ? { districtId } : {}) },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });
}

export async function getKelompokTaniReport(
  filters: KelompokTaniReportFilters = {},
): Promise<KelompokTaniReportResult> {
  if (!(await hasPermission("report-kelompok-tani", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }
  const access = await getAccessContext();

  // Scope via relasi farmer + filter Distrik/Lembaga (opsional). `AND` agar
  // beberapa kondisi relasi `farmer` tak saling menimpa (pitfall key-collision).
  const andFilters: Prisma.LandParcelWhereInput[] = [farmerRelationAccessFilter(access)];
  if (filters.farmerGroupId) andFilters.push({ farmer: { farmerGroupId: filters.farmerGroupId } });
  if (filters.districtId) andFilters.push({ farmer: { farmerGroup: { districtId: filters.districtId } } });

  const parcels = await prisma.landParcel.findMany({
    where: {
      isActive: true,
      farmer: { isActive: true },
      AND: andFilters,
    },
    select: {
      farmerId: true,
      area: true,
      subGroupLv1: true,
      subGroupLv2: true,
      farmer: {
        select: {
          farmerGroupId: true,
          farmerGroup: { select: { name: true } },
        },
      },
    },
  });

  const raw: KtRawParcel[] = parcels.map((p) => ({
    farmerId: p.farmerId,
    farmerGroupId: p.farmer.farmerGroupId,
    lembagaTani: p.farmer.farmerGroup.name,
    area: p.area,
    subGroupLv1: p.subGroupLv1,
    subGroupLv2: p.subGroupLv2,
  }));

  return buildKelompokTaniReport(raw);
}

/**
 * Report Kelompok Tani (Detail) — roster 1 Lembaga: hierarki Gapoktan/KUD → KT →
 * daftar Petani. RBAC 3-layer: `report-kelompok-tani-detail` VIEW + scope
 * (`farmerRelationAccessFilter` via `AND`) + `isActive`. Lembaga wajib & harus
 * berada dalam cakupan akses user; bila tak ada lahan, kembalikan roster kosong
 * dengan nama Lembaga (real-time, sumber `LandParcel.subGroupLv*` — #146).
 */
export async function getKelompokTaniDetailReport(
  farmerGroupId: string,
): Promise<KelompokTaniDetailReportResult> {
  if (!(await hasPermission("report-kelompok-tani-detail", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }
  const access = await getAccessContext();

  // Verifikasi Lembaga berada dalam cakupan akses user.
  const accessFilter =
    access.mode === "BY_FARMER_GROUP" ? { id: { in: access.ids } } :
    access.mode === "BY_DISTRICT" ? { districtId: { in: access.ids } } :
    {};
  const group = await prisma.farmerGroup.findFirst({
    where: { id: farmerGroupId, isActive: true, ...accessFilter },
    select: { id: true, name: true },
  });
  if (!group) {
    throw new Error("Lembaga Petani tidak ditemukan atau Anda tidak memiliki akses");
  }

  const parcels = await prisma.landParcel.findMany({
    where: {
      isActive: true,
      farmer: { isActive: true },
      AND: [farmerRelationAccessFilter(access), { farmer: { farmerGroupId } }],
    },
    select: {
      area: true,
      subGroupLv1: true,
      subGroupLv2: true,
      farmer: { select: { id: true, farmerId: true, name: true } },
    },
  });

  const raw: KtDetailRawParcel[] = parcels.map((p) => ({
    farmerId: p.farmer.id,
    farmerCode: p.farmer.farmerId,
    farmerName: p.farmer.name,
    area: p.area,
    subGroupLv1: p.subGroupLv1,
    subGroupLv2: p.subGroupLv2,
  }));

  return buildKelompokTaniDetailReport(group.id, group.name, raw);
}
