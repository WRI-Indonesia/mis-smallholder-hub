import { prisma } from "@/lib/prisma";
import { MARKER_SIMPLIFY_M, MARKER_SNAP_M, metersToDegrees, type LonLat, type NearbyMarker } from "@/lib/land-marker";

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
 * Titik penutup ganda dibuang. Urutan bagian lalu vertex — penomoran final
 * dilakukan `planMarkersFromVertices` (searah jarum jam dari utara).
 */
export async function fetchSimplifiedVertices(landParcelId: string): Promise<LonLat[]> {
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
  const out: LonLat[] = [];
  const byPoly = new Map<number, VertexRow[]>();
  for (const r of rows) byPoly.set(r.poly, [...(byPoly.get(r.poly) ?? []), r]);
  for (const ring of byPoly.values()) {
    const pts = ring.map((r) => ({ lon: Number(r.lon), lat: Number(r.lat) }));
    if (pts.length > 1) {
      const a = pts[0], z = pts[pts.length - 1];
      if (a.lon === z.lon && a.lat === z.lat) pts.pop();
    }
    out.push(...pts);
  }
  return out;
}

interface NearbyRow {
  id: string;
  longitude: number;
  latitude: number;
  parcel_ids: string[] | null;
  linked_here: boolean;
}

/**
 * Patok aktif ≤ MARKER_SNAP_M dari geometri lahan — semua vertex ada di batas,
 * jadi ini superset dari "≤ 5 m dari salah satu vertex"; penyaringan per vertex
 * dilakukan planner murni. Ikut daftar ID Lahan yang sudah memakai patok itu
 * (konteks "patok bersama") dan apakah sudah tertaut ke lahan ini (idempoten).
 */
export async function fetchNearbyMarkers(landParcelId: string, parcelUid: string): Promise<NearbyMarker[]> {
  const deg = metersToDegrees(MARKER_SNAP_M);
  const rows = await prisma.$queryRaw<NearbyRow[]>`
    SELECT m.id, m.longitude, m.latitude,
           (SELECT array_agg(i.parcel_id ORDER BY i.parcel_id)
              FROM tbl_land_parcel_marker l JOIN tbl_land_parcel_identity i ON i.id = l.parcel_uid
             WHERE l.marker_id = m.id AND l.is_active) AS parcel_ids,
           EXISTS (SELECT 1 FROM tbl_land_parcel_marker l WHERE l.marker_id = m.id AND l.is_active AND l.parcel_uid = ${parcelUid}) AS linked_here
    FROM tbl_land_marker m, tbl_land_parcel a
    WHERE a.id = ${landParcelId} AND a.geom IS NOT NULL AND m.is_active
      AND ST_DWithin(m.geom, a.geom, ${deg})
  `;
  return rows.map((r) => ({
    id: r.id,
    lon: Number(r.longitude),
    lat: Number(r.latitude),
    parcelIds: r.parcel_ids ?? [],
    linkedToThisParcel: Boolean(r.linked_here),
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
