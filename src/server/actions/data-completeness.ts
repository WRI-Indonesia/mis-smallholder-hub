"use server";

import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { getAccessContext, farmerGroupAccessFilter, rawFarmerGroupScope } from "@/lib/access-context";
import { computeCompleteness, currentPeriod } from "@/lib/data-completeness";
import {
  farmerModuleFlags,
  groupModuleFlags,
  loadEstimateRecordIds,
  loadModuleFlagSets,
  parcelGeometryAreaHa,
  parcelModuleFlags,
} from "@/lib/data-completeness-query";
import type { CompletenessGroupInput, DataCompletenessResult } from "@/types/data-completeness";

const MENU_KEY = "data-analyst-data-completeness";
const FORBIDDEN = "Tidak memiliki izin untuk mengakses data ini";

async function requireView() {
  if (!(await hasPermission(MENU_KEY, "VIEW"))) {
    throw new Error(FORBIDDEN);
  }
}

/** District list scoped to the user's data-access. */
export async function getDistrictsForCompleteness() {
  await requireView();
  const access = await getAccessContext();

  return prisma.district.findMany({
    where: {
      isActive: true,
      ...(access.mode === "BY_DISTRICT" ? { id: { in: access.ids } } : {}),
      ...(access.mode === "BY_FARMER_GROUP"
        ? { farmerGroups: { some: { id: { in: access.ids }, isActive: true } } }
        : {}),
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

/** Farmer-group list (cascading by district), scoped to the user's data-access. */
export async function getFarmerGroupsForCompleteness(districtId?: string | null) {
  await requireView();
  const access = await getAccessContext();

  return prisma.farmerGroup.findMany({
    where: {
      isActive: true,
      ...farmerGroupAccessFilter(access),
      ...(districtId ? { districtId } : {}),
    },
    select: { id: true, name: true, code: true, districtId: true },
    orderBy: { name: "asc" },
  });
}

/** Analyze data completeness & anomalies for a single farmer group. */
export async function analyzeFarmerGroupCompleteness(
  farmerGroupId: string
): Promise<DataCompletenessResult> {
  await requireView();
  const access = await getAccessContext();

  // Data-access scope enforcement: the requested KT must be within the user's scope.
  if (access.mode === "BY_FARMER_GROUP" && !access.ids.includes(farmerGroupId)) {
    throw new Error("Tidak memiliki akses ke Lembaga Petani ini");
  }

  const referencePeriod = currentPeriod();
  const referenceYear = Number(referencePeriod.slice(0, 4));
  // Scope Lembaga (termasuk distrik untuk BY_DISTRICT) dipasang ke SEMUA kueri —
  // satelit ikut kosong bila Lembaga di luar akses, bukan dimuat lalu dibuang.
  const groupWhere = {
    id: farmerGroupId,
    isActive: true,
    ...(access.mode === "BY_DISTRICT" ? { districtId: { in: access.ids } } : {}),
  };
  const farmerWhere = { isActive: true, farmerGroup: groupWhere };

  // Paket wajib (isActive, exclude OTHER) — kolom matriks & basis cakupan pelatihan.
  const [trainingPackages, group, moduleSets, estimateIds] = await Promise.all([
    prisma.trainingPackage.findMany({
      where: { isActive: true, code: { not: "OTHER" } },
      select: { code: true, name: true },
      orderBy: { code: "asc" },
    }),
    prisma.farmerGroup.findFirst({
      where: groupWhere,
      select: {
        id: true,
        name: true,
        code: true,
        abrv: true,
        joinYear: true,
        groupType: true,
        establishedYear: true,
        rspoCertYear: true,
        rspoCertStatus: true,
        ispoCertYear: true,
        ispoCertStatus: true,
        sapMapAssuranceYear: true,
        sapMapAssuranceStatus: true,
        locationLat: true,
        locationLong: true,
        district: { select: { id: true, name: true } },
        activities: {
          where: { isActive: true },
          select: { evidenceKey: true, package: { select: { code: true } } },
        },
        farmers: {
          where: { isActive: true },
          orderBy: { name: "asc" },
          select: {
            id: true,
            farmerId: true,
            name: true,
            gender: true,
            nik: true,
            address: true,
            birthPlace: true,
            birthDate: true,
            joinedYear: true,
            landParcels: {
              where: { isActive: true },
              select: {
                id: true,
                parcelUid: true,
                parcelId: true,
                geometry: true,
                area: true,
                plantingYear: true,
                cropType: true,
                landStatus: true,
                subGroupLv2: true,
                blok: true,
                isPsr: true,
              },
            },
            // Partisipasi hanya dihitung untuk activity KT ini yang aktif (Q3).
            trainingParticipants: {
              where: { isActive: true, activity: { isActive: true, farmerGroupId } },
              select: {
                id: true,
                preTestScore: true,
                postTestScore: true,
                activity: { select: { package: { select: { code: true } } } },
              },
            },
            productionRecords: {
              where: { isActive: true },
              select: { id: true, parcelId: true, period: true, yieldKg: true },
            },
          },
        },
      },
    }),
    // Kehadiran modul (#352 A1) + flag spasial — id-set per satelit, scope lewat relasi petani.
    loadModuleFlagSets({
      farmerWhere,
      groupWhere,
      scope: rawFarmerGroupScope(access, [farmerGroupId]),
      referenceYear,
    }),
    loadEstimateRecordIds(farmerWhere),
  ]);

  if (!group) {
    throw new Error("Lembaga Petani tidak ditemukan atau di luar akses Anda");
  }

  // Flatten nested activity→package into the shape expected by the pure logic.
  const input: CompletenessGroupInput = {
    id: group.id,
    name: group.name,
    code: group.code,
    abrv: group.abrv,
    joinYear: group.joinYear,
    groupType: group.groupType,
    establishedYear: group.establishedYear,
    rspoCertYear: group.rspoCertYear,
    rspoCertStatus: group.rspoCertStatus,
    ispoCertYear: group.ispoCertYear,
    ispoCertStatus: group.ispoCertStatus,
    sapMapAssuranceYear: group.sapMapAssuranceYear,
    sapMapAssuranceStatus: group.sapMapAssuranceStatus,
    locationLat: group.locationLat,
    locationLong: group.locationLong,
    district: group.district,
    trainingPackages,
    activities: group.activities.map((a) => ({
      packageCode: a.package.code,
      hasEvidence: a.evidenceKey != null,
    })),
    farmers: group.farmers.map((f) => ({
      id: f.id,
      farmerId: f.farmerId,
      name: f.name,
      gender: f.gender,
      nik: f.nik,
      address: f.address,
      birthPlace: f.birthPlace,
      birthDate: f.birthDate,
      joinedYear: f.joinedYear,
      landParcels: f.landParcels.map((p) => ({
        id: p.id,
        parcelId: p.parcelId,
        geometry: p.geometry,
        area: p.area,
        plantingYear: p.plantingYear,
        cropType: p.cropType,
        landStatus: p.landStatus,
        subGroupLv2: p.subGroupLv2,
        blok: p.blok,
        isPsr: p.isPsr,
        geometryAreaHa: parcelGeometryAreaHa(moduleSets, p.id),
        modules: parcelModuleFlags(moduleSets, p, group.id),
      })),
      trainingParticipants: f.trainingParticipants.map((tp) => ({
        id: tp.id,
        preTestScore: tp.preTestScore,
        postTestScore: tp.postTestScore,
        packageCode: tp.activity.package.code,
      })),
      productionRecords: f.productionRecords.map((r) => ({
        id: r.id,
        parcelId: r.parcelId,
        period: r.period,
        yieldKg: r.yieldKg,
        isEstimate: estimateIds.has(r.id),
      })),
      modules: farmerModuleFlags(moduleSets, f.id),
    })),
    modules: groupModuleFlags(moduleSets, group),
  };

  return computeCompleteness(input, { referencePeriod });
}
