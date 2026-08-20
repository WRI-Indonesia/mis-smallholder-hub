"use server";

import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { getAccessContext, farmerGroupAccessFilter } from "@/lib/access-context";
import type { FireBoundary } from "@/lib/fire-alert";
import type { MultiPolygon } from "geojson";

const VIEW = "VIEW";
const MENU_KEY = "dashboard-risk-fire";

/**
 * Kolom `geojson` bertipe `Json` polos — tidak ada constraint DB yang menjamin
 * isinya MultiPolygon, dan penulisnya adalah skrip seed di luar alur aplikasi.
 * Baris yang bukan MultiPolygon dibuang di sini karena gagalnya senyap dan
 * menyesatkan bila diloloskan: bbox jadi Infinity (peta tak pernah selesai
 * inisialisasi) dan point-in-polygon selalu false (semua titik terbaca "luar").
 */
function asMultiPolygon(geojson: unknown, label: string): MultiPolygon | null {
  if ((geojson as { type?: unknown } | null)?.type === "MultiPolygon") {
    return geojson as MultiPolygon;
  }
  const found = (geojson as { type?: unknown } | null)?.type ?? "kosong";
  console.warn(`[fire-alert] boundary "${label}" dilewati — geojson bertipe ${String(found)}, bukan MultiPolygon`);
  return null;
}

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

  return rows
    .map((r) => {
      const geometry = asMultiPolygon(r.geojson, r.farmerGroup.name);
      return geometry
        ? {
            id: r.id,
            farmerGroupId: r.farmerGroupId,
            name: r.farmerGroup.name,
            districtId: r.farmerGroup.districtId,
            districtName: r.farmerGroup.district.name,
            geometry,
          }
        : null;
    })
    .filter((b): b is FireBoundary => b !== null);
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
  return rows
    .map((r) => {
      const geometry = asMultiPolygon(r.geojson, r.name);
      return geometry ? { id: r.id, name: r.name, districtId: r.districtId, geometry } : null;
    })
    .filter((b): b is AdminBoundaryLine => b !== null);
}
