"use server";

import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { getAccessContext, getAccessibleDistrictIds } from "@/lib/access-context";
import { filterBmpGroups, normalizeBmpSnapshotData } from "@/lib/bmp-dashboard-aggregation";
import type { BmpSnapshotData, BmpSnapshotView } from "@/types/dashboard";
import type { AccessContext } from "@/lib/access-context";

/** Restrict a BMP snapshot's per-Lembaga data to the viewer's data-access scope. */
function scopeDataToAccess(data: BmpSnapshotData, access: AccessContext): BmpSnapshotData {
  if (access.mode === "BY_DISTRICT") {
    return { groups: filterBmpGroups(data, { districtIds: access.ids }) };
  }
  if (access.mode === "BY_FARMER_GROUP") {
    return { groups: filterBmpGroups(data, { groupIds: access.ids }) };
  }
  return data; // ALL
}

/**
 * Latest organization-wide BMP snapshot, scoped to the user. The BMP Dashboard
 * renders from this stored snapshot (not live data); Distrik/Lembaga/Kategori/
 * Tahun filters slice it entirely client-side. Per-Lembaga entries are filtered
 * to the viewer's scope so a limited user never sees aggregation outside it.
 */
export async function getLatestBmpSnapshot(): Promise<BmpSnapshotView | null> {
  if (!(await hasPermission("dashboard-bmp", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses dashboard BMP");
  }

  const access = await getAccessContext();
  const accessibleIds = await getAccessibleDistrictIds(access);
  // Which snapshot rows are visible: ALL → any; otherwise own districts + org-wide (NULL).
  const rowScope =
    accessibleIds === null ? {} : { OR: [{ districtId: { in: accessibleIds } }, { districtId: null }] };

  const snap = await prisma.bmpDashboardSnapshot.findFirst({
    where: { isActive: true, districtId: null, ...rowScope },
    orderBy: { snapshotDate: "desc" },
    select: {
      snapshotDate: true,
      data: true,
      createdByUser: { select: { name: true } },
    },
  });
  if (!snap) return null;

  const data = scopeDataToAccess(normalizeBmpSnapshotData(snap.data), access);

  return {
    snapshotDate: snap.snapshotDate.toISOString(),
    createdByName: snap.createdByUser.name,
    data,
  };
}
