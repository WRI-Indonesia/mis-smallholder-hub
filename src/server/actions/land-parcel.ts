"use server";

import { prisma } from "@/lib/prisma";
import { landParcelSchema, LandParcelFormValues } from "@/validations/land-parcel.schema";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/action-result";
import { Prisma } from "@prisma/client";

const REVALIDATE_PATH = "/admin/master-data/parcels";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LandParcelRow {
  id: string;
  farmerId: string;
  farmer: {
    name: string;
    nik: string;
    farmerGroup: { name: string };
  };
  commodityCode: string | null;
  commodity: { name: string } | null;
  wriParcelId: string | null;
  parcelCode: string | null;
  revision: number;
  polygonSizeHa: number | null;
  legalId: string | null;
  legalSizeHa: number | null;
  status: string | null;
  _count: {
    productions: number;
    maintenances: number;
  };
}

export interface PaginatedParcels {
  data: LandParcelRow[];
  total: number;
  page: number;
  totalPages: number;
}

export interface FarmerDropdownItem {
  id: string;
  name: string;
  nik: string;
  farmerGroup: { name: string };
}

export interface FarmerGroupDropdownItem {
  id: string;
  name: string;
  code: string | null;
}

export interface CommodityDropdownItem {
  code: string;
  name: string;
}

// ─── Read ────────────────────────────────────────────────────────────────────

export async function getLandParcels(
  page: number = 1,
  limit: number = 10,
  search?: string,
  farmerGroupId?: string
): Promise<ActionResult<PaginatedParcels>> {
  try {
    const where: Prisma.LandParcelWhereInput = {};

    if (search) {
      where.OR = [
        { parcelCode: { contains: search, mode: "insensitive" } },
        { farmer: { name: { contains: search, mode: "insensitive" } } },
        { farmer: { nik: { contains: search } } },
      ];
    }

    if (farmerGroupId) {
      where.farmer = { farmerGroupId };
    }

    const total = await prisma.landParcel.count({ where });
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;

    const data = await prisma.landParcel.findMany({
      where,
      orderBy: { farmer: { name: "asc" } },
      skip: offset,
      take: limit,
      select: {
        id: true,
        farmerId: true,
        farmer: {
          select: {
            name: true,
            nik: true,
            farmerGroup: { select: { name: true } },
          },
        },
        commodityCode: true,
        commodity: { select: { name: true } },
        wriParcelId: true,
        parcelCode: true,
        revision: true,
        polygonSizeHa: true,
        legalId: true,
        legalSizeHa: true,
        status: true,
        _count: {
          select: {
            productions: true,
            maintenances: true,
          },
        },
      },
    });

    return {
      success: true,
      data: {
        data: data as unknown as LandParcelRow[],
        total,
        page,
        totalPages,
      },
    };
  } catch (error) {
    console.error("Failed to fetch land parcels:", error);
    return { success: false, error: "Gagal memuat data persil lahan." };
  }
}

// ─── View with geometry (raw SQL for PostGIS) ────────────────────────────────

export interface LandParcelDetail extends LandParcelRow {
  polygonGeoJson: GeoJSON.Polygon | null;
  centerPointGeoJson: GeoJSON.Point | null;
}

export async function getLandParcelWithGeometry(
  id: string
): Promise<ActionResult<LandParcelDetail>> {
  try {
    // Fetch scalar fields via Prisma
    const base = await prisma.landParcel.findUnique({
      where: { id },
      select: {
        id: true,
        farmerId: true,
        farmer: {
          select: {
            name: true,
            nik: true,
            farmerGroup: { select: { name: true } },
          },
        },
        commodityCode: true,
        commodity: { select: { name: true } },
        wriParcelId: true,
        parcelCode: true,
        revision: true,
        polygonSizeHa: true,
        legalId: true,
        legalSizeHa: true,
        status: true,
        _count: {
          select: {
            productions: true,
            maintenances: true,
          },
        },
      },
    });

    if (!base) return { success: false, error: "Persil lahan tidak ditemukan." };

    // Fetch geometry as GeoJSON via raw SQL (PostGIS Unsupported fields)
    const geoRows = await prisma.$queryRaw<
      Array<{ polygon_geojson: string | null; center_geojson: string | null }>
    >`
      SELECT
        ST_AsGeoJSON(polygon)     AS polygon_geojson,
        ST_AsGeoJSON("centerPoint") AS center_geojson
      FROM "tbl-land-parcel"
      WHERE id = ${id}
    `;

    const geo = geoRows[0] ?? { polygon_geojson: null, center_geojson: null };

    return {
      success: true,
      data: {
        ...(base as unknown as LandParcelRow),
        polygonGeoJson: geo.polygon_geojson
          ? (JSON.parse(geo.polygon_geojson) as GeoJSON.Polygon)
          : null,
        centerPointGeoJson: geo.center_geojson
          ? (JSON.parse(geo.center_geojson) as GeoJSON.Point)
          : null,
      },
    };
  } catch (error) {
    console.error("Failed to fetch land parcel with geometry:", error);
    return { success: false, error: "Gagal memuat data persil lahan." };
  }
}

// ─── Create ──────────────────────────────────────────────────────────────────

export async function createLandParcel(
  data: LandParcelFormValues
): Promise<ActionResult> {
  try {
    const validated = landParcelSchema.parse(data);

    await prisma.landParcel.create({
      data: {
        farmerId: validated.farmerId,
        commodityCode: validated.commodityCode || null,
        parcelCode: validated.parcelCode || null,
        polygonSizeHa: validated.polygonSizeHa ?? null,
        legalId: validated.legalId || null,
        legalSizeHa: validated.legalSizeHa ?? null,
        status: validated.status || null,
      },
    });

    revalidatePath(REVALIDATE_PATH);
    return { success: true };
  } catch (error: any) {
    console.error("Failed to create land parcel:", error);
    return { success: false, error: error.message || "Gagal membuat persil lahan." };
  }
}

// ─── Update ──────────────────────────────────────────────────────────────────

export async function updateLandParcel(
  id: string,
  data: LandParcelFormValues
): Promise<ActionResult> {
  try {
    const validated = landParcelSchema.parse(data);

    await prisma.landParcel.update({
      where: { id },
      data: {
        farmerId: validated.farmerId,
        commodityCode: validated.commodityCode || null,
        parcelCode: validated.parcelCode || null,
        polygonSizeHa: validated.polygonSizeHa ?? null,
        legalId: validated.legalId || null,
        legalSizeHa: validated.legalSizeHa ?? null,
        status: validated.status || null,
      },
    });

    revalidatePath(REVALIDATE_PATH);
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update land parcel:", error);
    return { success: false, error: error.message || "Gagal mengupdate persil lahan." };
  }
}

// ─── Delete ──────────────────────────────────────────────────────────────────

export async function deleteLandParcel(id: string): Promise<ActionResult> {
  try {
    const parcel = await prisma.landParcel.findUnique({
      where: { id },
      select: {
        _count: {
          select: {
            productions: true,
            maintenances: true,
          },
        },
      },
    });

    if (!parcel) {
      return { success: false, error: "Persil lahan tidak ditemukan." };
    }

    const totalRelated =
      parcel._count.productions + parcel._count.maintenances;

    if (totalRelated > 0) {
      return {
        success: false,
        error: `Tidak dapat menghapus. Persil lahan masih memiliki ${parcel._count.productions} data produksi dan ${parcel._count.maintenances} data pemeliharaan.`,
      };
    }

    await prisma.landParcel.delete({ where: { id } });

    revalidatePath(REVALIDATE_PATH);
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete land parcel:", error);
    return { success: false, error: "Gagal menghapus persil lahan." };
  }
}

// ─── Dropdowns ───────────────────────────────────────────────────────────────

export async function getFarmersForDropdown(): Promise<
  ActionResult<FarmerDropdownItem[]>
> {
  try {
    const farmers = await prisma.farmer.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        nik: true,
        farmerGroup: { select: { name: true } },
      },
    });
    return { success: true, data: farmers };
  } catch (error) {
    console.error("Failed to fetch farmers for dropdown:", error);
    return { success: false, error: "Gagal memuat data petani." };
  }
}

export async function getFarmerGroupsForDropdown(): Promise<
  ActionResult<FarmerGroupDropdownItem[]>
> {
  try {
    const groups = await prisma.farmerGroup.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
    });
    return { success: true, data: groups };
  } catch (error) {
    console.error("Failed to fetch farmer groups for dropdown:", error);
    return { success: false, error: "Gagal memuat data kelompok tani." };
  }
}

export async function getCommodities(): Promise<
  ActionResult<CommodityDropdownItem[]>
> {
  try {
    const commodities = await prisma.commodity.findMany({
      orderBy: { name: "asc" },
      select: { code: true, name: true },
    });
    return { success: true, data: commodities };
  } catch (error) {
    console.error("Failed to fetch commodities:", error);
    return { success: false, error: "Gagal memuat data komoditas." };
  }
}
