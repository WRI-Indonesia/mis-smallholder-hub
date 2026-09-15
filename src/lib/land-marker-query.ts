import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { MARKER_SIMPLIFY_M, MARKER_SNAP_M, formatMarkerCode, type LonLat, type NearbyMarker } from "@/lib/land-marker";
import { metersToDegrees } from "@/lib/parcel-neighbor";
import { NKT_AFFECTED_STATUSES } from "@/lib/land-parcel-satellite-format";

/**
 * Kueri PostGIS untuk patok batas (#329). NOTE: tanpa cek permission — caller
 * WAJIB guard `hasPermission` + scope lahan (`resolveParcel` di action).
 * Semua memakai kolom generated `LandParcel.geom` (#317 Fase 1) dan
 * `LandMarker.geom` + GiST.
 */

interface VertexRow {
  poly: number;
  ring: number;
  idx: number;
  lon: number;
  lat: number;
}

/**
 * Vertex ring LUAR tiap poligon lahan, sudah disederhanakan
 * (`ST_SimplifyPreserveTopology`, ±1 m) supaya vertex kolinear/berhimpit
 * hasil digitasi lengkung (maks 60 vertex di prod) tidak jadi puluhan patok.
 * Titik penutup ganda dibuang. Satu ring per bagian, urutan batas utuh —
 * penomoran final dilakukan `planMarkersFromVertices` (searah jarum jam dari utara).
 */
export async function fetchSimplifiedVertices(landParcelId: string): Promise<LonLat[][]> {
  const deg = metersToDegrees(MARKER_SIMPLIFY_M);
  const rows = await prisma.$queryRaw<VertexRow[]>`
    SELECT (dp).path[1] AS poly, (dp).path[2] AS ring, (dp).path[3] AS idx,
           ST_X((dp).geom) AS lon, ST_Y((dp).geom) AS lat
    FROM (
      -- ST_Multi WAJIB: ST_SimplifyPreserveTopology mengembalikan POLYGON untuk
      -- MultiPolygon berkomponen satu, sehingga path ST_DumpPoints jadi 2 elemen
      -- (ring, idx) dan filter ring/idx di bawah salah baca (temuan uji 2026-09-14).
      SELECT ST_DumpPoints(ST_Multi(ST_SimplifyPreserveTopology(geom, ${deg}))) AS dp
      FROM tbl_land_parcel WHERE id = ${landParcelId} AND geom IS NOT NULL
    ) s
    WHERE (dp).path[2] = 1
    ORDER BY poly, idx
  `;
  // Satu array per bagian poligon, URUTAN BATAS dipertahankan (penomoran
  // mengikuti jalan batas, bukan sudut dari titik tengah — lihat orderClockwiseFromNorth).
  const out: LonLat[][] = [];
  const byPoly = new Map<number, VertexRow[]>();
  for (const r of rows) byPoly.set(r.poly, [...(byPoly.get(r.poly) ?? []), r]);
  for (const ring of byPoly.values()) {
    const pts = ring.map((r) => ({ lon: Number(r.lon), lat: Number(r.lat) }));
    if (pts.length > 1) {
      const a = pts[0], z = pts[pts.length - 1];
      if (a.lon === z.lon && a.lat === z.lat) pts.pop();
    }
    if (pts.length >= 3) out.push(pts);
  }
  return out;
}

interface NearbyRow {
  id: string;
  longitude: number;
  latitude: number;
  is_active: boolean;
  parcel_ids: string[] | null;
  linked_here: boolean;
}

/**
 * Patok ≤ MARKER_SNAP_M dari geometri lahan — semua vertex ada di batas,
 * jadi ini superset dari "≤ 5 m dari salah satu vertex"; penyaringan per vertex
 * dilakukan planner murni. Ikut daftar ID Lahan yang sudah memakai patok itu
 * (konteks "patok bersama") dan apakah sudah tertaut ke lahan ini (idempoten).
 * Patok NONAKTIF (semua tautannya pernah dilepas) ikut dikembalikan supaya
 * generate/unggah ulang menghidupkannya kembali, bukan membuat kembaran
 * beberapa cm di sebelahnya (temuan review 2026-09-14); planner memprioritaskan
 * yang aktif bila keduanya sama dekat.
 */
export async function fetchNearbyMarkers(landParcelId: string, parcelUid: string): Promise<NearbyMarker[]> {
  const deg = metersToDegrees(MARKER_SNAP_M);
  const rows = await prisma.$queryRaw<NearbyRow[]>`
    SELECT m.id, m.longitude, m.latitude, m.is_active,
           (SELECT array_agg(i.parcel_id ORDER BY i.parcel_id)
              FROM tbl_land_parcel_marker l JOIN tbl_land_parcel_identity i ON i.id = l.parcel_uid
             WHERE l.marker_id = m.id AND l.is_active) AS parcel_ids,
           EXISTS (SELECT 1 FROM tbl_land_parcel_marker l WHERE l.marker_id = m.id AND l.is_active AND l.parcel_uid = ${parcelUid}) AS linked_here
    FROM tbl_land_marker m, tbl_land_parcel a
    WHERE a.id = ${landParcelId} AND a.geom IS NOT NULL
      AND ST_DWithin(m.geom, a.geom, ${deg})
  `;
  return rows.map((r) => ({
    id: r.id,
    lon: Number(r.longitude),
    lat: Number(r.latitude),
    parcelIds: r.parcel_ids ?? [],
    linkedToThisParcel: Boolean(r.linked_here),
    isActive: Boolean(r.is_active),
  }));
}

/**
 * Jarak (m) tiap titik ke BATAS lahan — guard ≤ MARKER_MAX_DISTANCE_M untuk
 * koordinat GPS/manual (lat/long tertukar, desimal salah tempel). Satu kueri
 * untuk banyak titik (unggahan bisa ratusan baris per lahan).
 */
export async function distancesToParcelBoundary(landParcelId: string, points: LonLat[]): Promise<number[]> {
  if (points.length === 0) return [];
  const lons = points.map((p) => p.lon);
  const lats = points.map((p) => p.lat);
  const rows = await prisma.$queryRaw<{ i: number; d: number | null }[]>`
    SELECT t.i, ST_Distance(ST_Boundary(a.geom)::geography, ST_SetSRID(ST_MakePoint(t.lon, t.lat), 4326)::geography) AS d
    FROM tbl_land_parcel a,
         unnest(${lons}::float8[], ${lats}::float8[]) WITH ORDINALITY AS t(lon, lat, i)
    WHERE a.id = ${landParcelId} AND a.geom IS NOT NULL
    ORDER BY t.i
  `;
  // Lahan tanpa geometri → tak ada baris; anggap jarak tak terhingga (ditolak guard).
  const out = new Array<number>(points.length).fill(Number.POSITIVE_INFINITY);
  for (const r of rows) out[Number(r.i) - 1] = r.d == null ? Number.POSITIVE_INFINITY : Number(r.d);
  return out;
}

/**
 * Ambil `n` nomor kode patok berurutan untuk awalan Lembaga secara ATOMIK
 * (`INSERT … ON CONFLICT DO UPDATE … RETURNING`) — dua pengguna yang membuat
 * patok bersamaan tidak pernah mendapat nomor sama. Dipanggil di dalam
 * transaksi penulis; mengembalikan kode siap pakai urut.
 */
export async function allocateMarkerCodes(tx: Prisma.TransactionClient, prefix: string, n: number): Promise<string[]> {
  if (n <= 0) return [];
  const rows = await tx.$queryRaw<{ last_no: number }[]>`
    INSERT INTO tbl_land_marker_counter (prefix, last_no) VALUES (${prefix}, ${n})
    ON CONFLICT (prefix) DO UPDATE SET last_no = tbl_land_marker_counter.last_no + ${n}
    RETURNING last_no
  `;
  const last = Number(rows[0]?.last_no ?? n);
  return Array.from({ length: n }, (_, i) => formatMarkerCode(prefix, last - n + i + 1));
}

export interface MarkerPoint {
  id: string;
  code: string;
  longitude: number;
  latitude: number;
  condition: string;
  /** Salah satu lahan pemakai (di mana pun) termasuk/terdampak NKT. */
  nkt: boolean;
}

/**
 * Titik patok untuk peta sebaran Detail Lembaga / Detail Petani (#331): satu
 * baris per patok fisik yang dipakai lahan aktif milik petani dalam scope
 * pemanggil (`farmerWhere` = fragmen SQL pada alias `f`). Tanpa cek permission —
 * caller sudah lewat guard halaman detail.
 */
async function fetchMarkerPointsWhere(farmerWhere: Prisma.Sql): Promise<MarkerPoint[]> {
  const rows = await prisma.$queryRaw<{ id: string; code: string; longitude: number; latitude: number; condition: string; nkt: boolean }[]>`
    SELECT m.id, m.code, m.longitude, m.latitude, m.condition,
           EXISTS (
             SELECT 1 FROM tbl_land_parcel_marker l2
             JOIN tbl_land_parcel_nkt n ON n.parcel_uid = l2.parcel_uid
             WHERE l2.marker_id = m.id AND l2.is_active AND n.status::text IN (${Prisma.join([...NKT_AFFECTED_STATUSES])})
           ) AS nkt
    FROM tbl_land_marker m
    WHERE m.is_active AND EXISTS (
      SELECT 1 FROM tbl_land_parcel_marker l
      JOIN tbl_land_parcel p ON p.parcel_uid = l.parcel_uid AND p.is_active
      JOIN tbl_farmer f ON f.id = p.farmer_id AND f.is_active
      WHERE l.marker_id = m.id AND l.is_active AND ${farmerWhere}
    )
    ORDER BY m.code
  `;
  return rows.map((r) => ({ ...r, longitude: Number(r.longitude), latitude: Number(r.latitude), nkt: Boolean(r.nkt) }));
}

export const fetchFarmerGroupMarkerPoints = (farmerGroupId: string) => fetchMarkerPointsWhere(Prisma.sql`f.farmer_group_id = ${farmerGroupId}`);
export const fetchFarmerMarkerPoints = (farmerId: string) => fetchMarkerPointsWhere(Prisma.sql`f.id = ${farmerId}`);
