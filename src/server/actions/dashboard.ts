"use server";

import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { getAccessContext, getAccessibleDistrictIds } from "@/lib/access-context";
import { normalizeSnapshotData } from "@/lib/dashboard-aggregation";
import type { DashboardFilters, DashboardSnapshotView } from "@/types/dashboard";

/** Prisma `where` fragment limiting snapshots to those the current user may see. */
async function accessibleSnapshotScope() {
  const access = await getAccessContext();
  const ids = await getAccessibleDistrictIds(access);
  // ALL → no restriction; otherwise own districts + organization-wide (NULL district).
  return ids === null ? {} : { OR: [{ districtId: { in: ids } }, { districtId: null }] };
}

/**
 * Latest snapshot matching the selected district/year filters, scoped to the user.
 * The Main Dashboard renders from this stored snapshot (not live data).
 */
export async function getLatestDashboardSnapshot(
  filters: DashboardFilters = {}
): Promise<DashboardSnapshotView | null> {
  if (!(await hasPermission("dashboard-main", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses dashboard");
  }

  const scope = await accessibleSnapshotScope();

  const snap = await prisma.mainDashboardSnapshot.findFirst({
    where: {
      isActive: true,
      districtId: filters.districtId ?? null,
      joinedYear: filters.joinedYear ?? null,
      ...scope,
    },
    orderBy: { snapshotDate: "desc" },
    select: {
      snapshotDate: true,
      districtId: true,
      joinedYear: true,
      data: true,
      district: { select: { name: true } },
      createdByUser: { select: { name: true } },
    },
  });
  if (!snap) return null;

  return {
    snapshotDate: snap.snapshotDate.toISOString(),
    districtId: snap.districtId,
    districtName: snap.district?.name ?? null,
    joinedYear: snap.joinedYear,
    createdByName: snap.createdByUser.name,
    data: normalizeSnapshotData(snap.data),
  };
}

