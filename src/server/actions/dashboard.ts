"use server";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/types/action-result";

export interface DashboardStats {
  totalGroups: number;
  totalFarmers: number;
  maleFarmers: number;
  femaleFarmers: number;
  totalParcels: number;
  totalAreaHa: number;
  trainingPKT: number;
  trainingBMPGAP: number;
  trainingPreSertifikasi: number;
}

export interface DashboardGroupMarker {
  id: string;
  name: string;
  districtName: string;
  locationLat: number | null;
  locationLong: number | null;
  farmerCount: number;
  maleFarmers: number;
  femaleFarmers: number;
  parcelCount: number;
  totalAreaHa: number;
  trainingPKT: number;
  trainingBMPGAP: number;
  trainingPreSertifikasi: number;
}

export interface DashboardFilters {
  districtId?: string;
}

export async function getDashboardStats(
  filters: DashboardFilters = {}
): Promise<ActionResult<DashboardStats>> {
  try {
    const { districtId } = filters;

    // Build where clauses for different entities
    const groupWhere = districtId ? { districtId } : {};
    const farmerWhere = districtId ? { farmerGroup: { districtId } } : {};
    const parcelWhere = districtId ? { farmer: { farmerGroup: { districtId } } } : {};
    const trainingWhere = districtId ? { farmer: { farmerGroup: { districtId } } } : {};

    // Execute all queries in parallel
    const [
      totalGroups,
      totalFarmers,
      maleFarmers,
      femaleFarmers,
      totalParcels,
      totalAreaResult,
    ] = await Promise.all([
      // Group counts
      prisma.farmerGroup.count({ where: groupWhere }),
      
      // Farmer counts
      prisma.farmer.count({ where: farmerWhere }),
      prisma.farmer.count({ where: { ...farmerWhere, gender: "L" } }),
      prisma.farmer.count({ where: { ...farmerWhere, gender: "P" } }),
      
      // Parcel counts and area
      prisma.landParcel.count({ where: parcelWhere }),
      prisma.landParcel.aggregate({
        _sum: { polygonSizeHa: true },
        where: parcelWhere,
      }),
    ]);

    const stats: DashboardStats = {
      totalGroups,
      totalFarmers,
      maleFarmers,
      femaleFarmers,
      totalParcels,
      totalAreaHa: totalAreaResult._sum.polygonSizeHa ?? 0,
      // Training stats hardcoded to 0 for now
      trainingPKT: 0,
      trainingBMPGAP: 0,
      trainingPreSertifikasi: 0,
    };

    return { success: true, data: stats };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch dashboard stats",
    };
  }
}

export async function getDashboardGroupMarkers(
  filters: DashboardFilters = {}
): Promise<ActionResult<DashboardGroupMarker[]>> {
  try {
    const { districtId } = filters;

    // Fetch farmer groups with district info
    const groups = await prisma.farmerGroup.findMany({
      where: districtId ? { districtId } : {},
      include: {
        district: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    });

    // Calculate stats for each group in parallel
    const markers = await Promise.all(
      groups.map(async (group) => {
        const [
          farmerCount,
          maleFarmers,
          femaleFarmers,
          parcelCount,
          totalAreaResult,
        ] = await Promise.all([
          // Farmer counts for this group
          prisma.farmer.count({ where: { farmerGroupId: group.id } }),
          prisma.farmer.count({ where: { farmerGroupId: group.id, gender: "L" } }),
          prisma.farmer.count({ where: { farmerGroupId: group.id, gender: "P" } }),
          
          // Parcel counts and area for this group
          prisma.landParcel.count({ where: { farmer: { farmerGroupId: group.id } } }),
          prisma.landParcel.aggregate({
            _sum: { polygonSizeHa: true },
            where: { farmer: { farmerGroupId: group.id } },
          }),
        ]);

        const marker: DashboardGroupMarker = {
          id: group.id,
          name: group.name,
          districtName: group.district.name,
          locationLat: group.locationLat,
          locationLong: group.locationLong,
          farmerCount,
          maleFarmers,
          femaleFarmers,
          parcelCount,
          totalAreaHa: totalAreaResult._sum.polygonSizeHa ?? 0,
          // Training stats hardcoded to 0 for now
          trainingPKT: 0,
          trainingBMPGAP: 0,
          trainingPreSertifikasi: 0,
        };

        return marker;
      })
    );

    return { success: true, data: markers };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch dashboard group markers",
    };
  }
}

export async function getDistrictsForDashboard(): Promise<ActionResult<{ id: string; name: string }[]>> {
  try {
    const districts = await prisma.district.findMany({
      where: { farmerGroups: { some: {} } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });

    return { success: true, data: districts };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch districts for dashboard",
    };
  }
}