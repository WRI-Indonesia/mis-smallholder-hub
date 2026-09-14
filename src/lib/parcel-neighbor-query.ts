import type { Polygon, MultiPolygon } from "geojson";
import { prisma } from "@/lib/prisma";
import { getAccessContext, farmerRelationAccessFilter } from "@/lib/access-context";
import {
  NEIGHBOR_DISTANCE_M,
  metersToDegrees,
  applyNeighborScope,
  capNeighbors,
  type ParcelNeighbor,
  type ParcelNeighborRaw,
} from "@/lib/parcel-neighbor";

/**
 * Kueri lahan tetangga (#327) — dipakai Profil Lahan (`fetchParcelPassport`,
 * tiga menu pemanggil) dan peta Detail Lahan (`getLandParcelNeighbors`).
 * NOTE: TIDAK melakukan cek permission menu — caller WAJIB guard
 * `hasPermission`; scope diterapkan di sini (nama di luar scope dibuang).
 *
 * Bertumpu pada kolom generated `LandParcel.geom` + GiST (#317 Fase 1):
 * `ST_DWithin(geom, geom, derajat)` memakai index (`&&` + ST_Expand),
 * jarak sebenarnya dihitung `ST_Distance(::geography)` dalam meter.
 *
 * PENGECUALIAN SCOPE (tercatat di docs/product/access-context.md): kandidat
 * diambil tanpa filter scope supaya poligon semua tetangga bisa digambar;
 * kueri kedua memakai `farmerRelationAccessFilter` untuk menandai mana yang
 * dalam scope, lalu nama/kode petani di luar scope di-null-kan sebelum keluar
 * dari fungsi ini. Aturan akses tidak ditulis ulang di SQL.
 */
interface NeighborRow {
  id: string;
  parcelId: string;
  geometry: Polygon | MultiPolygon;
  farmerId: string;
  targetFarmerId: string;
  farmerName: string;
  farmerCode: string;
  groupName: string;
  distanceM: number;
  overlaps: boolean;
}

export async function fetchParcelNeighbors(
  landParcelId: string,
  limit: number,
): Promise<{ neighbors: ParcelNeighbor[]; omitted: number }> {
  const deg = metersToDegrees(NEIGHBOR_DISTANCE_M);
  // Ambil semua kandidat (bukan LIMIT di SQL) agar `omitted` akurat; sebaran
  // prod: median 4 tetangga, maksimum 25 (ukur 2026-09-14) — kecil.
  const rows = await prisma.$queryRaw<NeighborRow[]>`
    SELECT
      b.id,
      b.parcel_id                                   AS "parcelId",
      b.geometry,
      b.farmer_id                                   AS "farmerId",
      a.farmer_id                                   AS "targetFarmerId",
      f.name                                        AS "farmerName",
      f.farmer_id                                   AS "farmerCode",
      g.name                                        AS "groupName",
      ST_Distance(a.geom::geography, b.geom::geography) AS "distanceM",
      (ST_Intersects(a.geom, b.geom) AND NOT ST_Touches(a.geom, b.geom)) AS "overlaps"
    FROM tbl_land_parcel a
    JOIN tbl_land_parcel b
      ON b.id <> a.id AND b.is_active AND b.geom IS NOT NULL
     AND ST_DWithin(a.geom, b.geom, ${deg})
    JOIN tbl_farmer f ON f.id = b.farmer_id AND f.is_active
    JOIN tbl_farmer_group g ON g.id = f.farmer_group_id
    WHERE a.id = ${landParcelId} AND a.geom IS NOT NULL
  `;
  if (rows.length === 0) return { neighbors: [], omitted: 0 };

  const access = await getAccessContext();
  const inScope = await prisma.landParcel.findMany({
    where: { id: { in: rows.map((r) => r.id) }, ...farmerRelationAccessFilter(access) },
    select: { id: true },
  });
  const inScopeIds = new Set(inScope.map((p) => p.id));

  const raw: ParcelNeighborRaw[] = rows.map((r) => ({
    id: r.id,
    parcelId: r.parcelId,
    geometry: r.geometry,
    // Angka dari PostGIS bisa datang sebagai string (numeric) — normalkan.
    distanceM: Math.round(Number(r.distanceM) * 10) / 10,
    overlaps: Boolean(r.overlaps),
    farmerName: r.farmerName,
    farmerCode: r.farmerCode,
    groupName: r.groupName,
    sameFarmer: r.farmerId === r.targetFarmerId,
  }));
  const capped = capNeighbors(raw, limit);
  return { neighbors: applyNeighborScope(capped.neighbors, inScopeIds), omitted: capped.omitted };
}
