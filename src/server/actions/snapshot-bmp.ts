"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import {
  getAccessContext,
  getAccessibleDistrictIds,
  farmerGroupAccessFilter,
} from "@/lib/access-context";
import {
  buildBmpSnapshotData,
  normalizeBmpSnapshotData,
  sumBmpGroups,
  type BmpRawProduction,
} from "@/lib/bmp-dashboard-aggregation";
import { bmpSnapshotFiltersSchema, type BmpSnapshotFiltersInput } from "@/validations/snapshot.schema";
import type { ActionResult } from "@/types/action-result";
import type { BmpSnapshotDetail, BmpSnapshotListItem } from "@/types/dashboard";

const MENU_KEY = "dashboard-snapshot-bmp";

/** Whether a snapshot's districtId is visible given the accessible district ids (null = unrestricted). */
function canAccessDistrict(accessibleIds: string[] | null, districtId: string | null): boolean {
  if (accessibleIds === null) return true; // ALL
  if (districtId === null) return true; // organization-wide snapshot
  return accessibleIds.includes(districtId);
}

/**
 * Aggregate the BMP snapshot payload within the user's scope.
 * 1 query per entitas (group/farmer/parcel) + 1 `groupBy` produksi — tanpa N+1
 * (pola `getBmpMapData` MAP-02).
 */
async function aggregateBmpSnapshotData(districtId: string | null) {
  const access = await getAccessContext();
  // Access filter di AND agar `id: { in }` mode BY_FARMER_GROUP tak tertimpa (pitfall #127).
  const groupWhere = {
    isActive: true,
    ...(districtId ? { districtId } : {}),
    AND: farmerGroupAccessFilter(access),
  };

  const groups = await prisma.farmerGroup.findMany({
    where: groupWhere,
    select: {
      id: true,
      name: true,
      code: true,
      category: true,
      districtId: true,
      district: { select: { name: true } },
    },
    orderBy: { name: "asc" },
  });
  const groupIds = groups.map((g) => g.id);
  if (groupIds.length === 0) {
    return buildBmpSnapshotData([], [], [], []);
  }

  const farmerWhere = { isActive: true, farmerGroupId: { in: groupIds } };
  const [farmers, parcels, productionRows] = await Promise.all([
    prisma.farmer.findMany({
      where: farmerWhere,
      select: { id: true, farmerGroupId: true },
    }),
    prisma.landParcel.findMany({
      where: { isActive: true, farmer: farmerWhere },
      select: { id: true, farmerId: true, area: true },
    }),
    prisma.productionRecord.groupBy({
      by: ["farmerId", "parcelId", "period"],
      where: { isActive: true, farmer: farmerWhere },
      _sum: { yieldKg: true },
    }),
  ]);

  const production: BmpRawProduction[] = productionRows.map((r) => ({
    farmerId: r.farmerId,
    parcelId: r.parcelId,
    period: r.period,
    kg: r._sum.yieldKg ?? 0,
  }));

  return buildBmpSnapshotData(
    groups.map((g) => ({
      id: g.id,
      name: g.name,
      code: g.code,
      category: g.category,
      districtId: g.districtId,
      districtName: g.district?.name ?? null,
    })),
    farmers,
    parcels,
    production
  );
}

/** Generate a new BMP dashboard snapshot (district optional; NULL = all districts). */
export async function generateBmpSnapshot(
  input: BmpSnapshotFiltersInput
): Promise<ActionResult<{ id: string }>> {
  if (!(await hasPermission(MENU_KEY, "CREATE"))) {
    return { success: false, error: "Tidak memiliki izin untuk membuat snapshot BMP" };
  }

  const parsed = bmpSnapshotFiltersSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Filter snapshot tidak valid" };
  }
  const districtId = parsed.data.districtId ?? null;

  if (districtId) {
    const access = await getAccessContext();
    const accessibleIds = await getAccessibleDistrictIds(access);
    if (!canAccessDistrict(accessibleIds, districtId)) {
      return { success: false, error: "Anda tidak memiliki akses ke distrik ini" };
    }
  }

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { success: false, error: "Sesi tidak valid" };

  // Round to the nearest second so accidental double-clicks within a second dedupe.
  const snapshotDate = new Date();
  snapshotDate.setMilliseconds(0);

  const existing = await prisma.bmpDashboardSnapshot.findFirst({
    where: { snapshotDate, districtId, isActive: true },
    select: { id: true },
  });
  if (existing) {
    return { success: false, error: "Snapshot dengan filter yang sama sudah dibuat pada waktu ini" };
  }

  const data = await aggregateBmpSnapshotData(districtId);

  const snapshot = await prisma.bmpDashboardSnapshot.create({
    data: {
      snapshotDate,
      districtId,
      data: data as unknown as object,
      createdBy: userId,
      modifiedBy: userId,
    },
    select: { id: true },
  });

  revalidatePath("/admin/tools/snapshot-bmp");
  return { success: true, data: { id: snapshot.id } };
}

/** List BMP snapshots accessible to the user (own districts + organization-wide). */
export async function getBmpSnapshots(): Promise<BmpSnapshotListItem[]> {
  if (!(await hasPermission(MENU_KEY, "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses snapshot BMP");
  }

  const access = await getAccessContext();
  const accessibleIds = await getAccessibleDistrictIds(access);

  const snapshots = await prisma.bmpDashboardSnapshot.findMany({
    where: {
      isActive: true,
      ...(accessibleIds === null
        ? {}
        : { OR: [{ districtId: { in: accessibleIds } }, { districtId: null }] }),
    },
    select: {
      id: true,
      snapshotDate: true,
      districtId: true,
      data: true,
      district: { select: { name: true } },
      createdByUser: { select: { name: true } },
    },
    orderBy: { snapshotDate: "desc" },
  });

  return snapshots.map((s) => {
    const { totals } = sumBmpGroups(normalizeBmpSnapshotData(s.data).groups);
    return {
      id: s.id,
      snapshotDate: s.snapshotDate.toISOString(),
      districtId: s.districtId,
      districtName: s.district?.name ?? null,
      createdByName: s.createdByUser.name,
      totalProduksiTon: totals.produksiTon,
      lahanBerData: totals.lahanBerData,
      totalLahan: totals.totalLahan,
      petaniMelapor: totals.petaniMelapor,
      totalPetani: totals.totalPetani,
    };
  });
}

/** Full BMP snapshot detail (stored aggregated data). Returns null when not found. */
export async function getBmpSnapshotById(id: string): Promise<BmpSnapshotDetail | null> {
  if (!(await hasPermission(MENU_KEY, "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses snapshot BMP");
  }

  const snapshot = await prisma.bmpDashboardSnapshot.findFirst({
    where: { id, isActive: true },
    select: {
      id: true,
      snapshotDate: true,
      districtId: true,
      data: true,
      createdAt: true,
      district: { select: { name: true } },
      createdByUser: { select: { name: true } },
    },
  });
  if (!snapshot) return null;

  const access = await getAccessContext();
  const accessibleIds = await getAccessibleDistrictIds(access);
  if (!canAccessDistrict(accessibleIds, snapshot.districtId)) {
    throw new Error("Anda tidak memiliki akses ke snapshot ini");
  }

  return {
    id: snapshot.id,
    snapshotDate: snapshot.snapshotDate.toISOString(),
    districtId: snapshot.districtId,
    districtName: snapshot.district?.name ?? null,
    createdByName: snapshot.createdByUser.name,
    createdAt: snapshot.createdAt.toISOString(),
    data: normalizeBmpSnapshotData(snapshot.data),
  };
}

/** Soft-delete a BMP snapshot (isActive = false). */
export async function deleteBmpSnapshot(id: string): Promise<ActionResult> {
  if (!(await hasPermission(MENU_KEY, "DELETE"))) {
    return { success: false, error: "Tidak memiliki izin untuk menghapus snapshot BMP" };
  }

  const snapshot = await prisma.bmpDashboardSnapshot.findFirst({
    where: { id, isActive: true },
    select: { districtId: true },
  });
  if (!snapshot) return { success: false, error: "Snapshot tidak ditemukan" };

  const access = await getAccessContext();
  const accessibleIds = await getAccessibleDistrictIds(access);
  if (!canAccessDistrict(accessibleIds, snapshot.districtId)) {
    return { success: false, error: "Anda tidak memiliki akses ke snapshot ini" };
  }

  const session = await auth();
  await prisma.bmpDashboardSnapshot.update({
    where: { id },
    data: { isActive: false, modifiedBy: session?.user?.id ?? null },
  });

  revalidatePath("/admin/tools/snapshot-bmp");
  return { success: true };
}
