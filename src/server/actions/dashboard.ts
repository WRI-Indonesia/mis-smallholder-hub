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
  batchId?: string;
}

export async function getDashboardStats(
  filters: DashboardFilters = {}
): Promise<ActionResult<DashboardStats>> {
  try {
    const { districtId, batchId } = filters;

    // Get stats from cache table
    const cachedStats = await prisma.dashboardStats.findUnique({
      where: { 
        districtId_batchId: {
          districtId: districtId || "GLOBAL",
          batchId: batchId || "ALL"
        }
      },
    });

    if (!cachedStats) {
      return {
        success: false,
        error: `Dashboard stats not found for ${districtId ? `district ${districtId}` : 'global'} and ${batchId ? `batch ${batchId}` : 'all batches'}. Please refresh cache.`,
      };
    }

    const stats: DashboardStats = {
      totalGroups: cachedStats.totalGroups,
      totalFarmers: cachedStats.totalFarmers,
      maleFarmers: cachedStats.maleFarmers,
      femaleFarmers: cachedStats.femaleFarmers,
      totalParcels: cachedStats.totalParcels,
      totalAreaHa: cachedStats.totalAreaHa ?? 0,
      trainingPKT: cachedStats.trainingPKT,
      trainingBMPGAP: cachedStats.trainingBMPGAP,
      trainingPreSertifikasi: cachedStats.trainingPreSertifikasi,
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
    const { districtId, batchId } = filters;

    // Fetch cached group stats directly with coordinates
    const groupStats = await prisma.dashboardGroupStats.findMany({
      where: {
        batchId: batchId || "ALL",
        ...(districtId && {
          farmerGroup: { districtId }
        })
      },
      include: {
        farmerGroup: {
          select: { id: true, name: true }
        }
      },
      orderBy: {
        farmerGroup: { name: "asc" }
      }
    });

    // Map cached stats to markers
    const markers: DashboardGroupMarker[] = groupStats.map((stats) => ({
      id: stats.farmerGroup.id,
      name: stats.farmerGroup.name,
      districtName: stats.districtName,
      locationLat: stats.locationLat,
      locationLong: stats.locationLong,
      farmerCount: stats.farmerCount,
      maleFarmers: stats.maleFarmers,
      femaleFarmers: stats.femaleFarmers,
      parcelCount: stats.parcelCount,
      totalAreaHa: stats.totalAreaHa,
      trainingPKT: stats.trainingPKT,
      trainingBMPGAP: stats.trainingBMPGAP,
      trainingPreSertifikasi: stats.trainingPreSertifikasi,
    }));

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

export async function getBatchesForDashboard(): Promise<ActionResult<{ id: string; name: string }[]>> {
  try {
    const batches = await prisma.batch.findMany({
      orderBy: { code: "asc" },
      select: { id: true, name: true },
    });

    return { success: true, data: batches };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch batches for dashboard",
    };
  }
}
