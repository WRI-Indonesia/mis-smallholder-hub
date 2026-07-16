"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fetchParcelPassport, computeFarmerTrainingItems } from "@/lib/parcel-passport-query";
import { hasPermission } from "@/lib/rbac";
import {
  getAccessContext,
  farmerGroupAccessFilter,
  getAccessibleDistrictIds,
} from "@/lib/access-context";
import { buildMapData, buildBmpMapData, summarizeProduction } from "@/lib/map-data";
import { mapFilterSchema, bmpMapFilterSchema } from "@/validations/map.schema";
import type { ActionResult } from "@/types/action-result";
import type {
  MapData,
  MapFilters,
  MapSelectOption,
  MapGroupOption,
  FarmerTrainingItem,
  ParcelPassport,
  ProductionSummary,
  BmpMapData,
  BmpMapFilters,
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
  // The access filter goes in `AND` (not spread) so its `{ districtId/id: { in } }`
  // can't be overwritten by the required literal `districtId` or the literal
  // `id` — the key-collision scope-leak (BUG-007, pitfall #127).
  const groupWhere = {
    isActive: true,
    districtId,
    ...(farmerGroupId ? { id: farmerGroupId } : {}),
    ...(provinceId ? { district: { provinceId } } : {}),
    AND: farmerGroupAccessFilter(access),
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

const BMP_MENU_KEY = "map-bmp";

/**
 * Peta BMP — Layer 1: production-data availability per parcel. Loads land
 * parcels for the selected Lembaga Petani (RBAC-scoped) and classifies each into
 * 4 categories by how many consecutive months of production data it has.
 *
 * Unlike Peta Lahan, the query is bounded by Lembaga Petani (required); Provinsi
 * and Distrik only narrow the KT dropdown. Production is fetched once for all
 * parcels via a scoped groupBy (no N+1). Records with a null `parcelId` cannot
 * be attributed to a parcel and never affect its color.
 */
export async function getBmpMapData(
  filters: BmpMapFilters
): Promise<ActionResult<BmpMapData>> {
  if (!(await hasPermission(BMP_MENU_KEY, VIEW))) {
    return { success: false, error: "Tidak memiliki izin untuk mengakses data ini" };
  }

  const parsed = bmpMapFilterSchema.safeParse(filters);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const first = Object.values(fieldErrors).flat()[0];
    return { success: false, error: first ?? "Filter tidak valid" };
  }
  const { provinceId, districtId, farmerGroupId } = parsed.data;

  const access = await getAccessContext();

  // Shared scope for the selected FarmerGroup — reused for the KT layer and,
  // via the farmer relation, the parcel layer. The access filter goes in `AND`
  // (not spread) so its `{ id: { in } }` in BY_FARMER_GROUP mode can't be
  // overwritten by the literal `id` — the key-collision pitfall (see #127).
  const groupWhere = {
    isActive: true,
    id: farmerGroupId,
    ...(districtId ? { districtId } : {}),
    ...(provinceId ? { district: { provinceId } } : {}),
    AND: farmerGroupAccessFilter(access),
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

  // One scoped query for all parcels' production, summed per (parcel, period)
  // (avoids N+1). The _sum aggregate scans the same rows — no extra query cost.
  const parcelIds = parcelRows.map((p) => p.id);
  const productionByParcel = new Map<string, { period: string; kg: number }[]>();
  if (parcelIds.length > 0) {
    const rows = await prisma.productionRecord.groupBy({
      by: ["parcelId", "period"],
      where: { parcelId: { in: parcelIds }, isActive: true },
      _sum: { yieldKg: true },
    });
    for (const r of rows) {
      if (!r.parcelId) continue;
      const entry = { period: r.period, kg: r._sum.yieldKg ?? 0 };
      const list = productionByParcel.get(r.parcelId);
      if (list) list.push(entry);
      else productionByParcel.set(r.parcelId, [entry]);
    }
  }

  return { success: true, data: buildBmpMapData(groups, parcelRows, productionByParcel) };
}

/**
 * Training completion of a single farmer (parcel owner), lazily loaded when the
 * "Pelatihan Petani" section of the parcel popup is expanded. Returns one entry
 * per main package with the earliest attendance date, if any.
 * (Helper fetch dipindah ke lib/parcel-passport-query.ts — dipakai juga #172.)
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

  return computeFarmerTrainingItems(farmerId);
}

/**
 * All data for the Farm Passport PDF of a single parcel: farmer identity, land
 * info + geometry, training completion, and real per-year production.
 * RBAC-scoped via the parcel's farmer group.
 *
 * Pass `includeProduction: false` when the caller already holds the parcel's
 * production (e.g. the popup fetched it via `getParcelProduction`) to skip the
 * redundant query — the returned `production` is then an empty placeholder the
 * caller is expected to overwrite before rendering.
 */
export async function getParcelPassport(
  landParcelId: string,
  includeProduction = true
): Promise<ActionResult<ParcelPassport>> {
  if (!(await hasPermission(MENU_KEY, VIEW))) {
    return { success: false, error: "Tidak memiliki izin untuk mengakses data ini" };
  }

  return fetchParcelPassport(landParcelId, includeProduction);
}

/**
 * Production summary for a single parcel (Peta Lahan popup): cross-year monthly
 * average + per-year breakdown. RBAC-scoped via the parcel's farmer group.
 */
export async function getParcelProduction(landParcelId: string): Promise<ProductionSummary> {
  await requireView();

  const access = await getAccessContext();
  const parcel = await prisma.landParcel.findFirst({
    where: {
      id: landParcelId,
      isActive: true,
      farmer: { isActive: true, farmerGroup: farmerGroupAccessFilter(access) },
    },
    select: { id: true },
  });
  if (!parcel) {
    throw new Error("Lahan tidak ditemukan atau Anda tidak memiliki akses");
  }

  const records = await prisma.productionRecord.findMany({
    where: { parcelId: landParcelId, isActive: true },
    select: { period: true, yieldKg: true },
  });
  return summarizeProduction(records);
}
