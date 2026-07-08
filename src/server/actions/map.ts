"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import {
  getAccessContext,
  farmerGroupAccessFilter,
  getAccessibleDistrictIds,
} from "@/lib/access-context";
import { buildMapData } from "@/lib/map-data";
import { mapFilterSchema } from "@/validations/map.schema";
import type { ActionResult } from "@/types/action-result";
import type {
  MapData,
  MapFilters,
  MapSelectOption,
  MapGroupOption,
  FarmerTrainingItem,
} from "@/types/map";

const VIEW = "VIEW";
const MENU_KEY = "map-parcel";

async function requireView() {
  if (!(await hasPermission(MENU_KEY, VIEW))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }
}

/** Provinces within the user's data-access scope (for the Province filter). */
export async function getProvincesForMap(): Promise<MapSelectOption[]> {
  await requireView();
  const access = await getAccessContext();
  const districtIds = await getAccessibleDistrictIds(access);

  if (districtIds === null) {
    return prisma.province.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  }

  if (districtIds.length === 0) return [];

  const provinces = await prisma.province.findMany({
    where: { isActive: true, districts: { some: { id: { in: districtIds } } } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return provinces;
}

/** Districts within scope, optionally narrowed to a province (for the District filter). */
export async function getDistrictsForMap(
  provinceId?: string | null
): Promise<MapSelectOption[]> {
  await requireView();
  const access = await getAccessContext();
  const districtIds = await getAccessibleDistrictIds(access);

  const where: {
    isActive: boolean;
    provinceId?: string;
    id?: { in: string[] };
  } = { isActive: true };

  if (provinceId) where.provinceId = provinceId;
  if (districtIds !== null) where.id = { in: districtIds };

  return prisma.district.findMany({
    where,
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

/** Farmer groups within scope, optionally narrowed to a district (for the KT filter). */
export async function getFarmerGroupsForMap(
  districtId?: string | null
): Promise<MapGroupOption[]> {
  await requireView();
  const access = await getAccessContext();

  const where = {
    isActive: true,
    ...farmerGroupAccessFilter(access),
    ...(districtId ? { districtId } : {}),
  };

  return prisma.farmerGroup.findMany({
    where,
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });
}

/**
 * Load geospatial data for the map: KT points + land parcel polygons (with
 * derived centroids), scoped by RBAC and the selected filters. District is
 * required to bound the query.
 */
export async function getMapData(
  filters: MapFilters
): Promise<ActionResult<MapData>> {
  if (!(await hasPermission(MENU_KEY, VIEW))) {
    return { success: false, error: "Tidak memiliki izin untuk mengakses data ini" };
  }

  const parsed = mapFilterSchema.safeParse(filters);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const first = Object.values(fieldErrors).flat()[0];
    return { success: false, error: first ?? "Filter tidak valid" };
  }
  const { provinceId, districtId, farmerGroupId } = parsed.data;

  const access = await getAccessContext();

  // Shared scope for FarmerGroup — reused for both the KT layer and, via the
  // farmer relation, the parcel layer (LandParcel has no direct district/group).
  const groupWhere = {
    isActive: true,
    ...farmerGroupAccessFilter(access),
    districtId,
    ...(farmerGroupId ? { id: farmerGroupId } : {}),
    ...(provinceId ? { district: { provinceId } } : {}),
  };

  const [groups, parcelRows] = await Promise.all([
    prisma.farmerGroup.findMany({
      where: groupWhere,
      select: {
        id: true,
        name: true,
        code: true,
        locationLat: true,
        locationLong: true,
        district: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.landParcel.findMany({
      where: {
        isActive: true,
        geometry: { not: Prisma.DbNull },
        farmer: { isActive: true, farmerGroup: groupWhere },
      },
      select: {
        id: true,
        parcelId: true,
        farmerId: true,
        geometry: true,
        area: true,
        plantingYear: true,
        cropType: true,
        landStatus: true,
        farmer: {
          select: { name: true, farmerId: true, farmerGroup: { select: { name: true } } },
        },
      },
    }),
  ]);

  return { success: true, data: buildMapData(groups, parcelRows) };
}

// Main training packages shown in the parcel popup (OTHER excluded).
const TRAINING_PACKAGES: { code: string; label: string }[] = [
  { code: "PAKET_1_BMP_PC_RSPO_NKT", label: "Paket 1 - BMP" },
  { code: "PAKET_2_MK", label: "Paket 2 - MK" },
  { code: "PAKET_2_K3", label: "Paket 2 - HSE" },
  { code: "PAKET_3_4_GEDSI_FINANCIAL_LIVELIHOOD_BUSDEV", label: "Paket 3 & 4" },
];

/**
 * Training completion of a single farmer (parcel owner), lazily loaded when the
 * "Pelatihan Petani" section of the parcel popup is expanded. Returns one entry
 * per main package with the earliest attendance date, if any.
 */
export async function getFarmerTraining(farmerId: string): Promise<FarmerTrainingItem[]> {
  await requireView();

  const access = await getAccessContext();
  const farmer = await prisma.farmer.findFirst({
    where: { id: farmerId, isActive: true, farmerGroup: farmerGroupAccessFilter(access) },
    select: { id: true },
  });
  if (!farmer) {
    throw new Error("Petani tidak ditemukan atau Anda tidak memiliki akses");
  }

  const participations = await prisma.trainingParticipant.findMany({
    where: {
      farmerId,
      isActive: true,
      activity: { isActive: true, package: { code: { not: "OTHER" } } },
    },
    select: { activity: { select: { trainingDate: true, package: { select: { code: true } } } } },
  });

  // earliest date per package code
  const earliest = new Map<string, Date>();
  for (const p of participations) {
    const code = p.activity.package.code;
    const date = p.activity.trainingDate;
    const current = earliest.get(code);
    if (!current || date < current) earliest.set(code, date);
  }

  return TRAINING_PACKAGES.map(({ code, label }) => {
    const date = earliest.get(code);
    return { code, label, completed: date != null, date: date ? date.toISOString() : null };
  });
}
