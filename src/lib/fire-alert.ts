/**
 * Pure helpers Dashboard Risk Management — Fire Alert (#266): klasifikasi titik
 * api FIRMS terhadap boundary lembaga (point-in-polygon) + rekap per lembaga.
 * Bebas API Next/Node/MapLibre agar bisa diunit-test terisolasi.
 *
 * Point-in-polygon ditulis lokal (ray casting even-odd, mendukung MultiPolygon
 * berlubang) — volume kecil (ratusan titik × 30 boundary dengan pra-cek bbox),
 * tanpa menyeret @turf/turf ke bundle client.
 */

import type { Feature, FeatureCollection, MultiPolygon, Position } from "geojson";

/** Boundary lembaga siap render/klasifikasi (hasil `getFireBoundaries`). */
export type FireBoundary = {
  /** id baris tbl_farmer_group_boundary */
  id: string;
  farmerGroupId: string;
  name: string;
  districtId: string;
  districtName: string;
  geometry: MultiPolygon;
};

export type FireBoundaryIndexed = FireBoundary & {
  /** [west, south, east, north] — pra-cek murah sebelum point-in-polygon. */
  bbox: [number, number, number, number];
};

/** Bounding box sebuah MultiPolygon. */
export function multiPolygonBbox(geometry: MultiPolygon): [number, number, number, number] {
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  for (const polygon of geometry.coordinates) {
    for (const [lng, lat] of polygon[0] ?? []) {
      if (lng < w) w = lng;
      if (lng > e) e = lng;
      if (lat < s) s = lat;
      if (lat > n) n = lat;
    }
  }
  return [w, s, e, n];
}

export function indexBoundaries(boundaries: FireBoundary[]): FireBoundaryIndexed[] {
  return boundaries.map((b) => ({ ...b, bbox: multiPolygonBbox(b.geometry) }));
}

/** Ray casting even-odd terhadap satu ring (batas tepat di garis tak dijamin). */
function pointInRing(pt: Position, ring: Position[]): boolean {
  const [x, y] = pt;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** True bila titik berada dalam MultiPolygon (ring pertama luar, sisanya lubang). */
export function pointInMultiPolygon(pt: Position, geometry: MultiPolygon): boolean {
  for (const polygon of geometry.coordinates) {
    if (polygon.length === 0 || !pointInRing(pt, polygon[0])) continue;
    const inHole = polygon.slice(1).some((hole) => pointInRing(pt, hole));
    if (!inHole) return true;
  }
  return false;
}

/** Boundary pertama yang memuat titik (urutan input; null bila di luar semua). */
export function findContainingBoundary(
  pt: Position,
  boundaries: FireBoundaryIndexed[]
): FireBoundaryIndexed | null {
  for (const b of boundaries) {
    const [w, s, e, n] = b.bbox;
    if (pt[0] < w || pt[0] > e || pt[1] < s || pt[1] > n) continue;
    if (pointInMultiPolygon(pt, b.geometry)) return b;
  }
  return null;
}

/**
 * Tandai tiap titik api: `inBoundary` ("in"/"out") + `groupId`/`groupName` bila
 * di dalam — dipakai ekspresi styling MapLibre, popup, dan rekap panel.
 */
export function classifyHotspots(
  fc: FeatureCollection,
  boundaries: FireBoundaryIndexed[]
): FeatureCollection {
  const features: Feature[] = fc.features.map((f) => {
    const pt = f.geometry.type === "Point" ? (f.geometry.coordinates as Position) : null;
    const hit = pt ? findContainingBoundary(pt, boundaries) : null;
    return {
      ...f,
      properties: {
        ...(f.properties ?? {}),
        inBoundary: hit ? "in" : "out",
        groupId: hit?.farmerGroupId ?? null,
        groupName: hit?.name ?? null,
      },
    };
  });
  return { type: "FeatureCollection", features };
}

/** Satu baris tabel panel: lembaga × jumlah titik api dalam boundary-nya. */
export type FireGroupCount = {
  farmerGroupId: string;
  name: string;
  districtId: string;
  districtName: string;
  count: number;
};

/**
 * Rekap jumlah titik (ter-klasifikasi) per lembaga — lembaga tanpa titik tetap
 * muncul (count 0). Urut: jumlah menurun, lalu nama.
 */
export function countHotspotsByGroup(
  classified: FeatureCollection,
  boundaries: FireBoundary[]
): FireGroupCount[] {
  const counts = new Map<string, number>();
  for (const f of classified.features) {
    const groupId = f.properties?.groupId as string | null | undefined;
    if (groupId) counts.set(groupId, (counts.get(groupId) ?? 0) + 1);
  }
  return boundaries
    .map((b) => ({
      farmerGroupId: b.farmerGroupId,
      name: b.name,
      districtId: b.districtId,
      districtName: b.districtName,
      count: counts.get(b.farmerGroupId) ?? 0,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "id"));
}

export type FireSummary = {
  total: number;
  inside: number;
  outside: number;
  /** Jumlah lembaga dengan ≥1 titik dalam boundary. */
  groupsAffected: number;
};

export function summarizeFire(classified: FeatureCollection): FireSummary {
  let inside = 0;
  const groups = new Set<string>();
  for (const f of classified.features) {
    if (f.properties?.inBoundary === "in") {
      inside++;
      const groupId = f.properties?.groupId as string | null;
      if (groupId) groups.add(groupId);
    }
  }
  return {
    total: classified.features.length,
    inside,
    outside: classified.features.length - inside,
    groupsAffected: groups.size,
  };
}

/**
 * Saring titik: hanya yang berada di dalam salah satu wilayah (PiP + pra-cek
 * bbox). Dipakai membatasi hotspot FIRMS ke Provinsi Riau: Area API FIRMS
 * hanya menerima BBOX persegi (RIAU_BBOX ikut mencakup Malaysia/Sumbar/Jambi),
 * jadi hasilnya dipangkas terhadap gabungan 12 poligon kabupaten BIG.
 * `areas` kosong → kembalikan apa adanya (fallback bila batas belum di-seed).
 */
export function filterPointsWithinAreas(
  fc: FeatureCollection,
  areas: { geometry: MultiPolygon }[]
): FeatureCollection {
  if (areas.length === 0) return fc;
  const indexed = areas.map((a) => ({ ...a, bbox: multiPolygonBbox(a.geometry) }));
  const features = fc.features.filter((f) => {
    if (f.geometry.type !== "Point") return false;
    const pt = f.geometry.coordinates as Position;
    return indexed.some((a) => {
      const [w, s, e, n] = a.bbox;
      if (pt[0] < w || pt[0] > e || pt[1] < s || pt[1] > n) return false;
      return pointInMultiPolygon(pt, a.geometry);
    });
  });
  return { type: "FeatureCollection", features };
}

export type AreaCount = { name: string; count: number };

/**
 * Hitung titik per wilayah bernama (point-in-polygon + pra-cek bbox); titik di
 * luar semua wilayah masuk bucket `otherLabel`. Wilayah tanpa titik tetap
 * muncul (0) agar urutan baris tooltip stabil. Dipakai rincian kartu panel:
 * titik luar boundary per kabupaten (poligon BIG) + "Kab. Lainnya".
 */
export function countPointsByNamedArea(
  fc: FeatureCollection,
  areas: { name: string; geometry: MultiPolygon }[],
  otherLabel: string
): AreaCount[] {
  const indexed = areas.map((a) => ({ ...a, bbox: multiPolygonBbox(a.geometry) }));
  const counts = new Map<string, number>(areas.map((a) => [a.name, 0]));
  let other = 0;
  for (const f of fc.features) {
    if (f.geometry.type !== "Point") continue;
    const pt = f.geometry.coordinates as Position;
    let hitName: string | null = null;
    for (const a of indexed) {
      const [w, s, e, n] = a.bbox;
      if (pt[0] < w || pt[0] > e || pt[1] < s || pt[1] > n) continue;
      if (pointInMultiPolygon(pt, a.geometry)) {
        hitName = a.name;
        break;
      }
    }
    if (hitName) counts.set(hitName, (counts.get(hitName) ?? 0) + 1);
    else other++;
  }
  return [
    ...areas.map((a) => ({ name: a.name, count: counts.get(a.name) ?? 0 })),
    { name: otherLabel, count: other },
  ];
}

/** Gabungan bbox beberapa boundary — dasar auto-zoom cetak Per District/Lembaga. */
export function combinedBbox(
  boundaries: FireBoundaryIndexed[]
): [number, number, number, number] | null {
  if (boundaries.length === 0) return null;
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  for (const b of boundaries) {
    if (b.bbox[0] < w) w = b.bbox[0];
    if (b.bbox[1] < s) s = b.bbox[1];
    if (b.bbox[2] > e) e = b.bbox[2];
    if (b.bbox[3] > n) n = b.bbox[3];
  }
  return [w, s, e, n];
}
