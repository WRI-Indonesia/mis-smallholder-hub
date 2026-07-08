"use server";

import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { getAccessContext, getAccessibleDistrictIds } from "@/lib/access-context";
import { normalizeSnapshotData, scopeSnapshotData } from "@/lib/dashboard-aggregation";
import type { DashboardFilters, DashboardSnapshotData, DashboardSnapshotView } from "@/types/dashboard";
import type { AccessContext } from "@/lib/access-context";

/** Restrict a snapshot's aggregated data to the viewer's data-access scope. */
function scopeDataToAccess(data: DashboardSnapshotData, access: AccessContext): DashboardSnapshotData {
  if (access.mode === "BY_DISTRICT") {
    return scopeSnapshotData(data, { mode: "BY_DISTRICT", districtIds: access.ids });
  }
  if (access.mode === "BY_FARMER_GROUP") {
    return scopeSnapshotData(data, { mode: "BY_FARMER_GROUP", groupIds: access.ids });
  }
  return data; // ALL
}

/**
 * Latest snapshot matching the selected district/year filters, scoped to the user.
 * The Main Dashboard renders from this stored snapshot (not live data). The snapshot
 * data is filtered to the viewer's accessible KTs so a limited user never sees
 * aggregation outside their scope, even from an organization-wide snapshot.
 */
export async function getLatestDashboardSnapshot(
  filters: DashboardFilters = {}
): Promise<DashboardSnapshotView | null> {
  if (!(await hasPermission("dashboard-main", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses dashboard");
  }

  const access = await getAccessContext();
  const accessibleIds = await getAccessibleDistrictIds(access);
  // Which snapshot rows are visible: ALL → any; otherwise own districts + org-wide (NULL).
  const rowScope =
    accessibleIds === null ? {} : { OR: [{ districtId: { in: accessibleIds } }, { districtId: null }] };

  const snap = await prisma.mainDashboardSnapshot.findFirst({
    where: {
      isActive: true,
      districtId: filters.districtId ?? null,
      joinedYear: filters.joinedYear ?? null,
      ...rowScope,
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

  const data = scopeDataToAccess(normalizeSnapshotData(snap.data), access);

  return {
    snapshotDate: snap.snapshotDate.toISOString(),
    districtId: snap.districtId,
    districtName: snap.district?.name ?? null,
    joinedYear: snap.joinedYear,
    createdByName: snap.createdByUser.name,
    data,
  };
}

