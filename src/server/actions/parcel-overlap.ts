"use server";

import { Prisma } from "@prisma/client";
import type { Geometry, MultiPolygon, Polygon } from "geojson";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { getAccessContext, rawFarmerGroupScope, type AccessContext } from "@/lib/access-context";
import { buildOverlapRows, type OverlapRaw, type ParcelOverlapRow } from "@/lib/parcel-overlap";
import type { ActionResult } from "@/types/action-result";

/**
 * Tumpang Tindih Lahan (#317 Fase 2 — tab Tumpang Tindih).
 *
 * Bertumpu pada kolom generated `LandParcel.geom` + GiST (#317 Fase 1):
 * self-join `ST_Intersects` memakai index; interior harus beririsan (bukan
 * sekadar bersinggungan, `NOT ST_Touches`). Luas dihitung
 * `ST_Area(::geography)` (ellipsoid WGS84, tanpa memilih zona UTM). Terukur
 * 2026-09-23 di mis-dev: 14.174 lahan → 256 ms. Dihitung on-demand, tanpa snapshot.
 *
 * PENGECUALIAN SCOPE (tercatat di docs/product/access-context.md, keputusan
 * owner #317 2026-09-01): pasangan disaring dengan aturan *minimal satu sisi
 * di scope user*; sisi lawan tampil lengkap (nama petani, ID lahan, Lembaga) —
 * tanpa itu klaim ganda lintas Lembaga mustahil diverifikasi. Preseden: lahan
 * tetangga #327. `inScope` per sisi hanya menentukan tautan Detail Lahan
 * (halaman itu 404 di luar scope). Aturan scope diambil dari
 * `rawFarmerGroupScope` — tidak ditulis ulang di SQL.
 */
const MENU_KEY = "data-analyst-parcel-overlap";

/** Fragmen SQL "Lembaga alias `g` ada di scope"; `null` array = tanpa batas. */
function groupInScope(alias: "ga" | "gb", access: AccessContext): Prisma.Sql {
  const { groupIds, districtIds } = rawFarmerGroupScope(access);
  const g = Prisma.raw(alias);
  return Prisma.sql`((${groupIds ?? null}::text[] IS NULL OR ${g}.id = ANY(${groupIds ?? null}::text[]))
    AND (${districtIds ?? null}::text[] IS NULL OR ${g}.district_id = ANY(${districtIds ?? null}::text[])))`;
}

interface OverlapQueryRow {
  intersectionM2: number;
  aInScope: boolean;
  bInScope: boolean;
  aId: string; aParcelId: string; aKt: string | null; aAreaM2: number;
  aFarmerId: string; aFarmerCode: string; aFarmerName: string;
  aGroupId: string; aGroupName: string; aDistrictId: string; aDistrictName: string;
  bId: string; bParcelId: string; bKt: string | null; bAreaM2: number;
  bFarmerId: string; bFarmerCode: string; bFarmerName: string;
  bGroupId: string; bGroupName: string; bDistrictId: string; bDistrictName: string;
}

export async function getParcelOverlaps(): Promise<ParcelOverlapRow[]> {
  if (!(await hasPermission(MENU_KEY, "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }
  const access = await getAccessContext();
  const aIn = groupInScope("ga", access);
  const bIn = groupInScope("gb", access);

  // Irisan & luas dihitung di SQL; ambang buang (<100 m² DAN <1%) diterapkan
  // di `buildOverlapRows` agar aturannya teruji tanpa DB.
  const rows = await prisma.$queryRaw<OverlapQueryRow[]>`
    SELECT
      ST_Area(ST_Intersection(a.geom, b.geom)::geography) AS "intersectionM2",
      ${aIn} AS "aInScope",
      ${bIn} AS "bInScope",
      a.id AS "aId", a.parcel_id AS "aParcelId", a.sub_group_lv2 AS "aKt",
      ST_Area(a.geom::geography) AS "aAreaM2",
      fa.id AS "aFarmerId", fa.farmer_id AS "aFarmerCode", fa.name AS "aFarmerName",
      ga.id AS "aGroupId", ga.name AS "aGroupName", da.id AS "aDistrictId", da.name AS "aDistrictName",
      b.id AS "bId", b.parcel_id AS "bParcelId", b.sub_group_lv2 AS "bKt",
      ST_Area(b.geom::geography) AS "bAreaM2",
      fb.id AS "bFarmerId", fb.farmer_id AS "bFarmerCode", fb.name AS "bFarmerName",
      gb.id AS "bGroupId", gb.name AS "bGroupName", db.id AS "bDistrictId", db.name AS "bDistrictName"
    FROM tbl_land_parcel a
    JOIN tbl_land_parcel b
      ON a.id < b.id AND b.is_active AND b.geom IS NOT NULL
     AND ST_Intersects(a.geom, b.geom) AND NOT ST_Touches(a.geom, b.geom)
    JOIN tbl_farmer fa ON fa.id = a.farmer_id AND fa.is_active
    JOIN tbl_farmer fb ON fb.id = b.farmer_id AND fb.is_active
    JOIN tbl_farmer_group ga ON ga.id = fa.farmer_group_id
    JOIN tbl_farmer_group gb ON gb.id = fb.farmer_group_id
    JOIN reg_district da ON da.id = ga.district_id
    JOIN reg_district db ON db.id = gb.district_id
    WHERE a.is_active AND a.geom IS NOT NULL
      AND (${aIn} OR ${bIn})
  `;

  const inScopeIds = new Set<string>();
  const raws: OverlapRaw[] = rows.map((r) => {
    if (r.aInScope) inScopeIds.add(r.aId);
    if (r.bInScope) inScopeIds.add(r.bId);
    return {
      // Angka dari PostGIS bisa datang sebagai string (numeric) — normalkan.
      intersectionM2: Number(r.intersectionM2),
      a: {
        id: r.aId, parcelId: r.aParcelId, kelompokTani: r.aKt, areaM2: Number(r.aAreaM2),
        farmerId: r.aFarmerId, farmerCode: r.aFarmerCode, farmerName: r.aFarmerName,
        groupId: r.aGroupId, groupName: r.aGroupName, districtId: r.aDistrictId, districtName: r.aDistrictName,
      },
      b: {
        id: r.bId, parcelId: r.bParcelId, kelompokTani: r.bKt, areaM2: Number(r.bAreaM2),
        farmerId: r.bFarmerId, farmerCode: r.bFarmerCode, farmerName: r.bFarmerName,
        groupId: r.bGroupId, groupName: r.bGroupName, districtId: r.bDistrictId, districtName: r.bDistrictName,
      },
    };
  });
  return buildOverlapRows(raws, inScopeIds);
}

export interface OverlapPairGeometry {
  key: string;
  a: Polygon | MultiPolygon;
  b: Polygon | MultiPolygon;
  /** Area irisan (poligon saja; titik/garis hasil ST_Intersection dibuang). */
  intersection: Polygon | MultiPolygon | null;
}

/** Maksimum pasangan per permintaan geometri (ekspor semua temuan terukur 137). */
const MAX_GEOMETRY_PAIRS = 2000;
const pairKeysSchema = z
  .array(z.string().max(130).regex(/^[a-z0-9]+\|[a-z0-9]+$/i))
  .min(1)
  .max(MAX_GEOMETRY_PAIRS);

/**
 * Geometri pasangan (lahan A, lahan B, irisan) untuk preview peta (1 pasangan,
 * izin VIEW) atau ekspor SHP/GeoJSON (banyak pasangan, izin EXPORT). Pasangan
 * yang kedua sisinya di luar scope dibuang — aturan sama dengan daftar temuan.
 */
export async function getParcelOverlapGeometries(
  keys: string[],
  purpose: "preview" | "export",
): Promise<ActionResult<OverlapPairGeometry[]>> {
  const permission = purpose === "export" ? "EXPORT" : "VIEW";
  if (!(await hasPermission(MENU_KEY, permission))) {
    return { success: false, error: "Tidak memiliki izin untuk mengakses data ini" };
  }
  const parsed = pairKeysSchema.safeParse(keys);
  if (!parsed.success || (purpose === "preview" && parsed.data.length !== 1)) {
    return { success: false, error: "Pasangan lahan tidak valid" };
  }
  const aIds: string[] = [];
  const bIds: string[] = [];
  for (const k of parsed.data) {
    const [x, y] = k.split("|");
    aIds.push(x);
    bIds.push(y);
  }

  const access = await getAccessContext();
  const aIn = groupInScope("ga", access);
  const bIn = groupInScope("gb", access);
  const rows = await prisma.$queryRaw<{ aId: string; bId: string; ga: Geometry; gb: Geometry; gi: Geometry | null }[]>`
    SELECT
      a.id AS "aId", b.id AS "bId",
      a.geometry AS ga, b.geometry AS gb,
      ST_AsGeoJSON(ST_CollectionExtract(ST_Intersection(a.geom, b.geom), 3), 7)::json AS gi
    FROM unnest(${aIds}::text[], ${bIds}::text[]) AS k(a_id, b_id)
    JOIN tbl_land_parcel a ON a.id = k.a_id AND a.is_active AND a.geom IS NOT NULL
    JOIN tbl_land_parcel b ON b.id = k.b_id AND b.is_active AND b.geom IS NOT NULL
    JOIN tbl_farmer fa ON fa.id = a.farmer_id AND fa.is_active
    JOIN tbl_farmer fb ON fb.id = b.farmer_id AND fb.is_active
    JOIN tbl_farmer_group ga ON ga.id = fa.farmer_group_id
    JOIN tbl_farmer_group gb ON gb.id = fb.farmer_group_id
    WHERE ${aIn} OR ${bIn}
  `;

  const polygonal = (g: Geometry | null): Polygon | MultiPolygon | null => {
    const parsedGeom = typeof g === "string" ? (JSON.parse(g) as Geometry) : g;
    return parsedGeom && (parsedGeom.type === "Polygon" || parsedGeom.type === "MultiPolygon") ? parsedGeom : null;
  };
  const data: OverlapPairGeometry[] = [];
  for (const r of rows) {
    const a = polygonal(r.ga);
    const b = polygonal(r.gb);
    if (!a || !b) continue;
    const inter = polygonal(r.gi);
    // ST_CollectionExtract tanpa poligon menghasilkan MULTIPOLYGON EMPTY.
    data.push({ key: `${r.aId}|${r.bId}`, a, b, intersection: inter && inter.coordinates.length > 0 ? inter : null });
  }
  return { success: true, data };
}
