"use server";

import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/types/action-result";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MapFarmerGroup {
  id: string;
  name: string;
  code: string | null;
  lat: number;
  lng: number;
  farmerCount: number;
  districtName: string;
  provinceName: string;
}

export interface MapLandParcel {
  id: string;
  parcelCode: string | null;
  farmerName: string;
  groupId: string;
  groupName: string;
  polygonGeoJSON: GeoJSON.Polygon;
  polygonSizeHa: number | null;
  commodityName: string | null;
}

export interface MapData {
  farmerGroups: MapFarmerGroup[];
  landParcels: MapLandParcel[];
  stats: {
    totalGroups: number;
    totalFarmers: number;
    totalParcels: number;
    groupsWithCoords: number;
    parcelsWithPolygon: number;
  };
}

// ─── Action ───────────────────────────────────────────────────────────────────

export async function getMapData(): Promise<ActionResult<MapData>> {
  try {
    // ── Farmer Groups with coordinates ──────────────────────────────────────
    const groups = await prisma.farmerGroup.findMany({
      where: {
        locationLat: { not: null },
        locationLong: { not: null },
      },
      select: {
        id: true,
        name: true,
        code: true,
        locationLat: true,
        locationLong: true,
        district: {
          select: {
            name: true,
            province: { select: { name: true } },
          },
        },
        _count: { select: { farmers: true } },
      },
      orderBy: { name: "asc" },
    });

    const farmerGroups: MapFarmerGroup[] = groups.map((g) => ({
      id: g.id,
      name: g.name,
      code: g.code,
      lat: g.locationLat!,
      lng: g.locationLong!,
      farmerCount: g._count.farmers,
      districtName: g.district.name,
      provinceName: g.district.province.name,
    }));

    // ── Land Parcels with polygon (raw SQL for PostGIS) ──────────────────────
    const parcelRows = await prisma.$queryRaw<
      {
        id: string;
        parcel_code: string | null;
        farmer_name: string;
        group_id: string;
        group_name: string;
        polygon_geojson: string;
        polygon_size_ha: number | null;
        commodity_name: string | null;
      }[]
    >`
      SELECT
        p.id,
        p.parcel_code,
        f.name AS farmer_name,
        fg.id AS group_id,
        fg.name AS group_name,
        ST_AsGeoJSON(p.polygon)::text AS polygon_geojson,
        p.polygon_size_ha,
        c.name AS commodity_name
      FROM "tbl-land-parcel" p
      JOIN "tbl-farmer" f ON f.id = p.farmer_id
      JOIN "tbl-farmer-group" fg ON fg.id = f.farmer_group_id
      LEFT JOIN "ref-commodity" c ON c.code = p.commodity_code
      WHERE p.polygon IS NOT NULL
      ORDER BY p.parcel_code ASC
    `;

    const landParcels: MapLandParcel[] = parcelRows.map((row) => ({
      id: row.id,
      parcelCode: row.parcel_code,
      farmerName: row.farmer_name,
      groupId: row.group_id,
      groupName: row.group_name,
      polygonGeoJSON: JSON.parse(row.polygon_geojson) as GeoJSON.Polygon,
      polygonSizeHa: row.polygon_size_ha,
      commodityName: row.commodity_name,
    }));

    // ── Stats ────────────────────────────────────────────────────────────────
    const [totalFarmers, totalParcels] = await Promise.all([
      prisma.farmer.count(),
      prisma.landParcel.count(),
    ]);

    return {
      success: true,
      data: {
        farmerGroups,
        landParcels,
        stats: {
          totalGroups: await prisma.farmerGroup.count(),
          totalFarmers,
          totalParcels,
          groupsWithCoords: farmerGroups.length,
          parcelsWithPolygon: landParcels.length,
        },
      },
    };
  } catch (error) {
    console.error("[getMapData] error:", error);
    return { success: false, error: "Gagal memuat data peta" };
  }
}
