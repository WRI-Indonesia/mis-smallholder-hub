"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { getAccessContext, getAccessibleDistrictIds } from "@/lib/access-context";
import { aggregateDashboardData, getDashboardFilterOptions } from "@/lib/dashboard-query";
import { normalizeSnapshotData, toSnapshotData } from "@/lib/dashboard-aggregation";
import { snapshotFiltersSchema, type SnapshotFiltersInput } from "@/validations/snapshot.schema";
import type { ActionResult } from "@/types/action-result";
import type {
  DashboardFilterOptions,
  SnapshotDetail,
  SnapshotListItem,
} from "@/types/dashboard";

/** Whether a snapshot's districtId is visible given the accessible district ids (null = unrestricted). */
function canAccessDistrict(accessibleIds: string[] | null, districtId: string | null): boolean {
  if (accessibleIds === null) return true; // ALL
  if (districtId === null) return true; // organization-wide snapshot
  return accessibleIds.includes(districtId);
}

/** Generate a new dashboard snapshot for the given filters (district + joined year). */
export async function generateSnapshot(
  input: SnapshotFiltersInput
): Promise<ActionResult<{ id: string }>> {
  if (!(await hasPermission("dashboard-snapshot", "CREATE"))) {
    return { success: false, error: "Tidak memiliki izin untuk membuat snapshot" };
  }

  const parsed = snapshotFiltersSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Filter snapshot tidak valid" };
  }

  const districtId = parsed.data.districtId ?? null;
  const joinedYear = parsed.data.joinedYear ?? null;

  // Validate the requested district is within the user's access scope.
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

  const existing = await prisma.mainDashboardSnapshot.findFirst({
    where: { snapshotDate, districtId, joinedYear, isActive: true },
    select: { id: true },
  });
  if (existing) {
    return { success: false, error: "Snapshot dengan filter yang sama sudah dibuat pada waktu ini" };
  }

  const data = toSnapshotData(await aggregateDashboardData({ districtId, joinedYear }));

  const snapshot = await prisma.mainDashboardSnapshot.create({
    data: {
      snapshotDate,
      districtId,
      joinedYear,
      data: data as unknown as object,
      createdBy: userId,
      modifiedBy: userId,
    },
    select: { id: true },
  });

  revalidatePath("/admin/tools/snapshot");
  return { success: true, data: { id: snapshot.id } };
}

/** District + joined-year options for the snapshot generation form (scoped to the user). */
export async function getSnapshotFilterOptions(): Promise<DashboardFilterOptions> {
  if (!(await hasPermission("dashboard-snapshot", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses snapshot");
  }
  return getDashboardFilterOptions();
}

/** List snapshots accessible to the user (own districts + organization-wide). */
export async function getSnapshots(): Promise<SnapshotListItem[]> {
  if (!(await hasPermission("dashboard-snapshot", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses snapshot");
  }

  const access = await getAccessContext();
  const accessibleIds = await getAccessibleDistrictIds(access);

  const snapshots = await prisma.mainDashboardSnapshot.findMany({
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
      joinedYear: true,
      data: true,
      district: { select: { name: true } },
      createdByUser: { select: { name: true } },
    },
    orderBy: { snapshotDate: "desc" },
  });

  return snapshots.map((s) => {
    const data = normalizeSnapshotData(s.data);
    return {
      id: s.id,
      snapshotDate: s.snapshotDate.toISOString(),
      districtId: s.districtId,
      districtName: s.district?.name ?? null,
      joinedYear: s.joinedYear,
      createdByName: s.createdByUser.name,
      totalKelompokTani: data.totalKelompokTani,
      totalPetani: data.totalPetani,
      totalPetaniLaki: data.totalPetaniLaki,
      totalPetaniPerempuan: data.totalPetaniPerempuan,
      totalPersilLahan: data.totalPersilLahan,
      totalLuasLahan: data.totalLuasLahan,
    };
  });
}

/** Full snapshot detail (stored aggregated data). Returns null when not found. */
export async function getSnapshotById(id: string): Promise<SnapshotDetail | null> {
  if (!(await hasPermission("dashboard-snapshot", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses snapshot");
  }

  const snapshot = await prisma.mainDashboardSnapshot.findFirst({
    where: { id, isActive: true },
    select: {
      id: true,
      snapshotDate: true,
      districtId: true,
      joinedYear: true,
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
    joinedYear: snapshot.joinedYear,
    createdByName: snapshot.createdByUser.name,
    createdAt: snapshot.createdAt.toISOString(),
    data: normalizeSnapshotData(snapshot.data),
  };
}

/** Soft-delete a snapshot (isActive = false). */
export async function deleteSnapshot(id: string): Promise<ActionResult> {
  if (!(await hasPermission("dashboard-snapshot", "DELETE"))) {
    return { success: false, error: "Tidak memiliki izin untuk menghapus snapshot" };
  }

  const snapshot = await prisma.mainDashboardSnapshot.findFirst({
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
  await prisma.mainDashboardSnapshot.update({
    where: { id },
    data: { isActive: false, modifiedBy: session?.user?.id ?? null },
  });

  revalidatePath("/admin/tools/snapshot");
  return { success: true };
}
