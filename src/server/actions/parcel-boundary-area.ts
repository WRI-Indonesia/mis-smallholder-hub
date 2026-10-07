"use server";

import { Prisma } from "@prisma/client";
import type { Geometry, MultiPolygon, Polygon } from "geojson";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { getAccessContext, rawFarmerGroupScope, type AccessContext } from "@/lib/access-context";
import {
  PARCEL_AREA_MISMATCH_RATIO,
  buildAreaMismatchRows,
  buildOutsideBoundaryRows,
  type AreaMismatchRow,
  type OutsideBoundaryRow,
} from "@/lib/parcel-boundary-area";
import { OVERLAP_GEOMETRY_CHUNK } from "@/lib/parcel-overlap";
import type { ActionResult } from "@/types/action-result";

/**
 * Tumpang Tindih Lahan (#317 Fase 2) — tab Luar Boundary & Selisih Luas.
 * Definisi = check kualitas DA-02 (lihat `src/lib/parcel-boundary-area.ts`).
 *
 * Berbeda dengan tab Tumpang Tindih, temuan di sini menyangkut SATU lahan, jadi
 * scope akses berlaku NORMAL (tanpa pengecualian #317): hanya lahan milik
 * Lembaga dalam jangkauan user. Kolom `geom` generated + GiST (#317 Fase 1).
 */
const MENU_KEY = "data-analyst-parcel-overlap";

/** Fragmen SQL "Lembaga alias `g` ada di scope" (aturan dari `rawFarmerGroupScope`). */
function groupScope(access: AccessContext): Prisma.Sql {
  const { groupIds, districtIds } = rawFarmerGroupScope(access);
  return Prisma.sql`((${groupIds ?? null}::text[] IS NULL OR g.id = ANY(${groupIds ?? null}::text[]))
    AND (${districtIds ?? null}::text[] IS NULL OR g.district_id = ANY(${districtIds ?? null}::text[])))`;
}

interface ParcelBaseRow {
  id: string; parcelId: string; kelompokTani: string | null;
  farmerId: string; farmerCode: string; farmerName: string;
  groupId: string; groupName: string; districtId: string; districtName: string;
}

const BASE_COLUMNS = Prisma.sql`
  p.id, p.parcel_id AS "parcelId", p.sub_group_lv2 AS "kelompokTani",
  f.id AS "farmerId", f.farmer_id AS "farmerCode", f.name AS "farmerName",
  g.id AS "groupId", g.name AS "groupName", d.id AS "districtId", d.name AS "districtName"`;

const base = (r: ParcelBaseRow) => ({
  id: r.id, parcelId: r.parcelId, kelompokTani: r.kelompokTani,
  farmerId: r.farmerId, farmerCode: r.farmerCode, farmerName: r.farmerName,
  groupId: r.groupId, groupName: r.groupName, districtId: r.districtId, districtName: r.districtName,
});

/**
 * Lahan yang keluar dari boundary ICS Lembaganya. Boundary per Lembaga di-union
 * SEKALI (CTE), lalu hanya lahan yang tidak `ST_CoveredBy` yang dihitung selisihnya —
 * pengukuran per-lahan dengan union berulang terukur 1,4 dtk (mis-dev 2026-10-07).
 * Lahan Lembaga tanpa boundary ber-`geom` tidak dicek (sama dengan DA-02).
 */
export async function getParcelOutsideBoundary(): Promise<OutsideBoundaryRow[]> {
  if (!(await hasPermission(MENU_KEY, "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }
  const access = await getAccessContext();
  const rows = await prisma.$queryRaw<(ParcelBaseRow & { polygonM2: number; intersects: boolean; outsideM2: number; distanceM: number | null })[]>`
    WITH gb AS (
      SELECT b.farmer_group_id, ST_Union(b.geom) AS g
      FROM tbl_farmer_group_boundary b
      WHERE b.is_active AND b.geom IS NOT NULL
      GROUP BY b.farmer_group_id
    )
    SELECT ${BASE_COLUMNS},
      ST_Area(p.geom::geography) AS "polygonM2",
      ST_Intersects(gb.g, p.geom) AS "intersects",
      CASE WHEN ST_Intersects(gb.g, p.geom)
        THEN ST_Area(ST_Difference(p.geom, gb.g)::geography)
        ELSE ST_Area(p.geom::geography) END AS "outsideM2",
      CASE WHEN ST_Intersects(gb.g, p.geom) THEN NULL
        ELSE ST_Distance(p.geom::geography, gb.g::geography) END AS "distanceM"
    FROM tbl_land_parcel p
    JOIN tbl_farmer f ON f.id = p.farmer_id AND f.is_active
    JOIN tbl_farmer_group g ON g.id = f.farmer_group_id AND g.is_active
    JOIN reg_district d ON d.id = g.district_id
    JOIN gb ON gb.farmer_group_id = g.id
    WHERE p.is_active AND p.geom IS NOT NULL
      AND NOT ST_CoveredBy(p.geom, gb.g)
      AND ${groupScope(access)}
  `;
  return buildOutsideBoundaryRows(
    rows.map((r) => ({
      ...base(r),
      // Angka PostGIS bisa datang sebagai string (numeric) — normalkan.
      polygonM2: Number(r.polygonM2),
      intersects: r.intersects,
      outsideM2: Number(r.outsideM2),
      distanceM: r.distanceM == null ? null : Number(r.distanceM),
    }))
  );
}

/** Lahan yang luas kolomnya beda > ambang DA-02 dari luas poligonnya. */
export async function getParcelAreaMismatch(): Promise<AreaMismatchRow[]> {
  if (!(await hasPermission(MENU_KEY, "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }
  const access = await getAccessContext();
  // Disaring di SQL dengan ambang yang SAMA (konstanta DA-02) agar tak mengirim
  // belasan ribu lahan; `buildAreaMismatchRows` menerapkan aturan yang sama lagi (teruji).
  const rows = await prisma.$queryRaw<(ParcelBaseRow & { recordedHa: number; polygonM2: number })[]>`
    SELECT ${BASE_COLUMNS}, p.area AS "recordedHa", x.m2 AS "polygonM2"
    FROM tbl_land_parcel p
    JOIN tbl_farmer f ON f.id = p.farmer_id AND f.is_active
    JOIN tbl_farmer_group g ON g.id = f.farmer_group_id AND g.is_active
    JOIN reg_district d ON d.id = g.district_id
    CROSS JOIN LATERAL (SELECT ST_Area(p.geom::geography) AS m2) x
    WHERE p.is_active AND p.geom IS NOT NULL AND p.area > 0 AND x.m2 > 0
      AND abs(p.area - x.m2 / 10000) / greatest(p.area, x.m2 / 10000) > ${PARCEL_AREA_MISMATCH_RATIO}
      AND ${groupScope(access)}
  `;
  return buildAreaMismatchRows(
    rows.map((r) => ({ ...base(r), recordedHa: Number(r.recordedHa), polygonM2: Number(r.polygonM2) }))
  );
}

export interface ParcelFindingGeometry {
  id: string;
  parcel: Polygon | MultiPolygon | null;
  /** Union boundary ICS Lembaga lahan ini (disederhanakan) — hanya `preview` + `withBoundary`. */
  boundary: Polygon | MultiPolygon | null;
}

const idsSchema = z.array(z.string().min(1).max(40).regex(/^[a-z0-9]+$/i)).min(1).max(OVERLAP_GEOMETRY_CHUNK);

/**
 * Geometri lahan temuan untuk preview peta (1 lahan, izin VIEW, opsional boundary
 * Lembaganya) atau ekspor SHP/GeoJSON (banyak lahan, izin EXPORT). Lahan di luar
 * scope dibuang — id datang dari client, tidak dipercaya.
 */
export async function getParcelFindingGeometries(
  ids: string[],
  purpose: "preview" | "export",
  withBoundary = false,
): Promise<ActionResult<ParcelFindingGeometry[]>> {
  const permission = purpose === "export" ? "EXPORT" : "VIEW";
  if (!(await hasPermission(MENU_KEY, permission))) {
    return { success: false, error: "Tidak memiliki izin untuk mengakses data ini" };
  }
  const parsed = idsSchema.safeParse(ids);
  if (!parsed.success || (purpose === "preview" && parsed.data.length !== 1)) {
    return { success: false, error: "Lahan tidak valid" };
  }
  const boundary = purpose === "preview" && withBoundary;
  const access = await getAccessContext();
  const rows = await prisma.$queryRaw<{ id: string; gp: Geometry | string | null; gb: Geometry | string | null }[]>`
    SELECT p.id,
      ST_AsGeoJSON(p.geom, 7)::json AS gp,
      CASE WHEN ${boundary}::boolean THEN (
        SELECT ST_AsGeoJSON(ST_SimplifyPreserveTopology(ST_Union(b.geom), 0.00005), 6)::json
        FROM tbl_farmer_group_boundary b
        WHERE b.farmer_group_id = g.id AND b.is_active AND b.geom IS NOT NULL
      ) END AS gb
    FROM tbl_land_parcel p
    JOIN tbl_farmer f ON f.id = p.farmer_id AND f.is_active
    JOIN tbl_farmer_group g ON g.id = f.farmer_group_id AND g.is_active
    WHERE p.id = ANY(${parsed.data}::text[]) AND p.is_active AND p.geom IS NOT NULL
      AND ${groupScope(access)}
  `;
  const polygonal = (g: Geometry | string | null): Polygon | MultiPolygon | null => {
    const v = typeof g === "string" ? (JSON.parse(g) as Geometry) : g;
    return v && (v.type === "Polygon" || v.type === "MultiPolygon") && v.coordinates.length > 0 ? v : null;
  };
  return { success: true, data: rows.map((r) => ({ id: r.id, parcel: polygonal(r.gp), boundary: polygonal(r.gb) })) };
}
