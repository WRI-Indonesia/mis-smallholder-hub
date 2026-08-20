"use server";

import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { getAccessContext, farmerGroupAccessFilter } from "@/lib/access-context";
import type { FireBoundary } from "@/lib/fire-alert";
import type { MultiPolygon } from "geojson";

const VIEW = "VIEW";
const MENU_KEY = "dashboard-risk-fire";

/**
 * Boundary lembaga (ICS) untuk Dashboard Fire Alert (#266), dibatasi
 * data-access scope user (BY_DISTRICT / BY_FARMER_GROUP). Geometri dibaca dari
 * kolom cache `geojson` — kolom PostGIS `geom` hanya untuk analisa spasial.
 */
export async function getFireBoundaries(): Promise<FireBoundary[]> {
  if (!(await hasPermission(MENU_KEY, VIEW))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }
  const access = await getAccessContext();

  const rows = await prisma.farmerGroupBoundary.findMany({
    where: {
      isActive: true,
      farmerGroup: { isActive: true, ...farmerGroupAccessFilter(access) },
    },
    select: {
      id: true,
      farmerGroupId: true,
      geojson: true,
      farmerGroup: {
        select: {
          name: true,
          districtId: true,
          district: { select: { name: true } },
        },
      },
    },
    orderBy: { farmerGroup: { name: "asc" } },
  });

  return rows.map((r) => ({
    id: r.id,
    farmerGroupId: r.farmerGroupId,
    name: r.farmerGroup.name,
    districtId: r.farmerGroup.districtId,
    districtName: r.farmerGroup.district.name,
    geometry: r.geojson as unknown as MultiPolygon,
  }));
}

export type AdminBoundaryLine = {
  id: string;
  name: string;
  /** District program yang cocok saat seed — null bila kabupaten non-program. */
  districtId: string | null;
  geometry: MultiPolygon;
};

/**
 * Garis batas administrasi kabupaten (BIG) sebagai konteks peta Fire Alert.
 * Sengaja TANPA filter access-context: ini garis referensi publik se-Riau
 * (setara basemap), bukan data program per wilayah.
 */
export async function getAdminBoundaries(): Promise<AdminBoundaryLine[]> {
  if (!(await hasPermission(MENU_KEY, VIEW))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }
  const rows = await prisma.administrativeBoundary.findMany({
    where: { level: "KABUPATEN", isActive: true },
    select: { id: true, name: true, districtId: true, geojson: true },
    orderBy: { name: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    districtId: r.districtId,
    geometry: r.geojson as unknown as MultiPolygon,
  }));
}
