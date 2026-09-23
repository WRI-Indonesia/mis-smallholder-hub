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
 * Dua halaman memakai batas administrasi, jadi cukup salah satu izin VIEW —
 * pola yang sama dengan proxy `/api/map-hotspot`, dicek berurutan agar
 * pemegang `dashboard-risk-fire` (pemanggil terbanyak) tak membayar query
 * kedua.
 */
async function requireBoundaryRead(): Promise<void> {
  if (
    !(await hasPermission(MENU_KEY, VIEW)) &&
    !(await hasPermission("map-parcel", VIEW))
  ) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }
}

/**
 * Garis batas administrasi kabupaten (BIG) sebagai konteks peta Fire Alert,
 * dan penyaring wilayah Provinsi Riau untuk titik api Peta Lahan (#269).
 * Sengaja TANPA filter access-context: ini garis referensi publik se-Riau
 * (setara basemap), bukan data program per wilayah.
 *
 * Untuk **memangkas** titik api ke Riau, pakai `getRiauOutline()` — bukan
 * fungsi ini (#280).
 */
export async function getAdminBoundaries(): Promise<AdminBoundaryLine[]> {
  await requireBoundaryRead();
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

/**
 * Outline Provinsi Riau: 12 poligon kabupaten BIG **di-union lebih dulu**
 * (`geom` resolusi penuh) lalu disederhanakan satu kali.
 *
 * Kenapa bukan `getAdminBoundaries()` (#280): kolom cache `geojson`
 * disederhanakan **per kabupaten dan independen**, sehingga batas bersama dua
 * kabupaten tetangga tak lagi berimpit persis. Titik api yang jatuh di celah
 * tipis antara dua poligon berada di luar KEDUANYA → hilang dari Fire Alert
 * dan Peta Lahan tanpa jejak apa pun. Terukur di mis-dev: **9,4 km²** wilayah
 * Riau tidak tertutup satu pun poligon kabupaten tersimplifikasi. Union
 * melarutkan batas dalam lebih dulu, jadi celah itu tidak pernah terbentuk —
 * hasilnya malah lebih kecil (75 KB vs 90 KB).
 *
 * `geom` tetap sumber kebenaran spasial; yang berubah hanya urutan
 * union → simplify, bukan simplify → union.
 */
export async function getRiauOutline(): Promise<MultiPolygon | null> {
  await requireBoundaryRead();
  return cachedOutline();
}

/** Hasil query mentah — satu baris, satu kolom. */
type OutlineRow = { geojson: unknown };

/**
 * `ST_Union` 12 kabupaten resolusi penuh memakan ±450 ms (terukur mis-dev),
 * terlalu mahal per muat halaman. Datanya hanya berubah saat skrip seed batas
 * administrasi dijalankan, jadi hasilnya ditahan di memori proses.
 *
 * TTL tetap ada supaya re-seed tak menuntut restart; 6 jam mengikuti pola
 * `data_availability` FIRMS. Promise-nya yang di-cache (bukan hasilnya) agar
 * dua permintaan bersamaan tidak memicu dua union.
 */
const OUTLINE_TTL_MS = 6 * 60 * 60 * 1000;
let outlineCache: { at: number; value: Promise<MultiPolygon | null> } | null = null;

function cachedOutline(): Promise<MultiPolygon | null> {
  const now = Date.now();
  if (outlineCache && now - outlineCache.at < OUTLINE_TTL_MS) return outlineCache.value;
  const value = queryRiauOutline().catch((err) => {
    // Kegagalan tak boleh dikunci selama 6 jam — pemanggil jatuh ke poligon
    // per kabupaten, dan percobaan berikutnya harus benar-benar mencoba lagi.
    outlineCache = null;
    throw err;
  });
  outlineCache = { at: now, value };
  return value;
}

async function queryRiauOutline(): Promise<MultiPolygon | null> {
  const rows = await prisma.$queryRaw<OutlineRow[]>`
    SELECT ST_AsGeoJSON(
             ST_Multi(ST_SimplifyPreserveTopology(ST_Union("geom"), 0.001))
           )::jsonb AS geojson
    FROM "tbl_administrative_boundary"
    WHERE "is_active" = true AND "level" = 'KABUPATEN' AND "geom" IS NOT NULL
  `;
  // Tanpa baris yang memenuhi syarat, ST_Union mengembalikan NULL (bukan nol baris).
  return rows[0]?.geojson == null ? null : asMultiPolygon(rows[0].geojson, "Outline Riau");
}
