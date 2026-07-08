import { prisma } from "@/lib/prisma";
import { getAccessContext, farmerGroupAccessFilter } from "@/lib/access-context";
import { buildDashboardData, type RawFarmer, type RawGroup } from "@/lib/dashboard-aggregation";
import type { DashboardData, DashboardFilters, DashboardFilterOptions } from "@/types/dashboard";

/**
 * Aggregate dashboard statistics and per-KT details within the current user's scope.
 * NOTE: performs no permission check — callers MUST guard with `hasPermission` first.
 * - District filter narrows every metric and the map.
 * - Joined-year filter narrows farmer-derived metrics only (not the KT count).
 */
export async function aggregateDashboardData(filters: DashboardFilters = {}): Promise<DashboardData> {
  const access = await getAccessContext();
  const accessFilter = farmerGroupAccessFilter(access);

  const groups = await prisma.farmerGroup.findMany({
    where: {
      isActive: true,
      ...accessFilter,
      ...(filters.districtId ? { districtId: filters.districtId } : {}),
      // Wrapped in AND so it composes with (not overrides) the access filter's `id` scope.
      ...(filters.farmerGroupId ? { AND: [{ id: filters.farmerGroupId }] } : {}),
    },
    select: {
      id: true,
      name: true,
      code: true,
      locationLat: true,
      locationLong: true,
    },
    orderBy: { name: "asc" },
  });

  const groupIds = groups.map((g) => g.id);

  const farmers =
    groupIds.length === 0
      ? []
      : await prisma.farmer.findMany({
          where: {
            isActive: true,
            farmerGroupId: { in: groupIds },
            ...(filters.joinedYear ? { joinedYear: filters.joinedYear } : {}),
          },
          select: {
            id: true,
            farmerGroupId: true,
            gender: true,
            landParcels: {
              where: { isActive: true },
              select: { area: true },
            },
            trainingParticipants: {
              where: { isActive: true },
              select: {
                activity: {
                  select: {
                    isActive: true,
                    package: { select: { code: true } },
                  },
                },
              },
            },
          },
        });

  return buildDashboardData(groups as RawGroup[], farmers as RawFarmer[]);
}

/** Districts and joined-years available to the user for the filter bar. No permission check. */
export async function getDashboardFilterOptions(): Promise<DashboardFilterOptions> {
  const access = await getAccessContext();

  const districtWhere: Record<string, unknown> = { isActive: true };
  if (access.mode === "BY_DISTRICT") {
    districtWhere.id = { in: access.ids };
  } else if (access.mode === "BY_FARMER_GROUP") {
    districtWhere.farmerGroups = { some: { id: { in: access.ids }, isActive: true } };
  }

  const [districts, farmerYears] = await Promise.all([
    prisma.district.findMany({
      where: districtWhere,
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.farmer.findMany({
      where: {
        isActive: true,
        joinedYear: { not: null },
        farmerGroup: { isActive: true, ...farmerGroupAccessFilter(access) },
      },
      select: { joinedYear: true },
      distinct: ["joinedYear"],
    }),
  ]);

  const joinedYears = farmerYears
    .map((f) => f.joinedYear)
    .filter((y): y is number => y != null)
    .sort((a, b) => b - a);

  return { districts, joinedYears };
}
