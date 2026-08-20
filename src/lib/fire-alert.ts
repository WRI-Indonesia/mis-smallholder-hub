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

/** SEMUA boundary yang memuat titik — boundary bisa bertumpuk/bersama (KSJ & KBJ). */
export function findContainingBoundaries(
  pt: Position,
  boundaries: FireBoundaryIndexed[]
): FireBoundaryIndexed[] {
  const hits: FireBoundaryIndexed[] = [];
  for (const b of boundaries) {
    const [w, s, e, n] = b.bbox;
    if (pt[0] < w || pt[0] > e || pt[1] < s || pt[1] > n) continue;
    if (pointInMultiPolygon(pt, b.geometry)) hits.push(b);
  }
  return hits;
}

/** Boundary pertama yang memuat titik (urutan input; null bila di luar semua). */
export function findContainingBoundary(
  pt: Position,
  boundaries: FireBoundaryIndexed[]
): FireBoundaryIndexed | null {
  return findContainingBoundaries(pt, boundaries)[0] ?? null;
}

/**
 * Tandai tiap titik api: `inBoundary` ("in"/"out"); bila di dalam juga
 * `groupIds` (SEMUA lembaga pemilik — satu poligon bisa bersama, mis. KSJ &
 * KBJ, keputusan owner 2026-08-19) dan `groupName` (nama digabung " & ").
 * Dipakai ekspresi styling MapLibre, popup, tabel, dan PDF.
 *
 * Hit di-dedup per lembaga: bila satu lembaga punya >1 boundary aktif yang
 * sama-sama memuat titik, tanpa dedup titik itu terhitung dua kali dan salah
 * ditandai "bersama" (`groupIds.length > 1`) padahal pemiliknya satu.
 */
export function classifyHotspots(
  fc: FeatureCollection,
  boundaries: FireBoundaryIndexed[]
): FeatureCollection {
  const features: Feature[] = fc.features.map((f) => {
    const pt = f.geometry.type === "Point" ? (f.geometry.coordinates as Position) : null;
    const owners = new Map<string, FireBoundaryIndexed>();
    for (const h of pt ? findContainingBoundaries(pt, boundaries) : []) {
      if (!owners.has(h.farmerGroupId)) owners.set(h.farmerGroupId, h);
    }
    const hits = [...owners.values()];
    return {
      ...f,
      properties: {
        ...(f.properties ?? {}),
        inBoundary: hits.length > 0 ? "in" : "out",
        groupIds: hits.map((h) => h.farmerGroupId),
        groupName: hits.length > 0 ? hits.map((h) => h.name).join(" & ") : null,
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
  /** Berapa dari `count` yang berada di wilayah tumpang-tindih (juga dihitung
   *  di lembaga lain) — dasar keterangan anti-"double counting" di UI/PDF. */
  shared: number;
};

/**
 * Rekap jumlah titik (ter-klasifikasi) per lembaga — lembaga tanpa titik tetap
 * muncul (count 0); titik dalam boundary bersama dihitung di TIAP pemiliknya
 * (kartu ringkasan tetap menghitung titik unik via `summarizeFire`).
 * Urut: jumlah menurun, lalu nama.
 *
 * Baris dibangun per LEMBAGA, bukan per baris boundary: relasi
 * FarmerGroup→boundary adalah 1-ke-banyak tanpa unique constraint, sehingga
 * satu lembaga dengan >1 boundary aktif (mis. seed gagal di antara
 * soft-delete dan insert) akan muncul dobel dengan jumlah titik penuh di
 * masing-masing baris, dan menggelembungkan penyebut "Lembaga Terdampak".
 */
export function countHotspotsByGroup(
  classified: FeatureCollection,
  boundaries: FireBoundary[]
): FireGroupCount[] {
  const counts = new Map<string, number>();
  const sharedCounts = new Map<string, number>();
  for (const f of classified.features) {
    const groupIds = (f.properties?.groupIds as string[] | undefined) ?? [];
    for (const groupId of groupIds) {
      counts.set(groupId, (counts.get(groupId) ?? 0) + 1);
      if (groupIds.length > 1) sharedCounts.set(groupId, (sharedCounts.get(groupId) ?? 0) + 1);
    }
  }
  const groupById = new Map<string, FireBoundary>();
  for (const b of boundaries) {
    if (!groupById.has(b.farmerGroupId)) groupById.set(b.farmerGroupId, b);
  }
  return [...groupById.values()]
    .map((b) => ({
      farmerGroupId: b.farmerGroupId,
      name: b.name,
      districtId: b.districtId,
      districtName: b.districtName,
      count: counts.get(b.farmerGroupId) ?? 0,
      shared: sharedCounts.get(b.farmerGroupId) ?? 0,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "id"));
}

export type FireSummary = {
  total: number;
  inside: number;
  outside: number;
  /** Titik unik yang berada di wilayah tumpang-tindih ≥2 lembaga. */
  insideShared: number;
  /** Jumlah lembaga dengan ≥1 titik dalam boundary. */
  groupsAffected: number;
};

export function summarizeFire(classified: FeatureCollection): FireSummary {
  let inside = 0;
  let insideShared = 0;
  const groups = new Set<string>();
  for (const f of classified.features) {
    if (f.properties?.inBoundary === "in") {
      inside++;
      const groupIds = (f.properties?.groupIds as string[] | undefined) ?? [];
      if (groupIds.length > 1) insideShared++;
      for (const groupId of groupIds) groups.add(groupId);
    }
  }
  return {
    total: classified.features.length,
    inside,
    outside: classified.features.length - inside,
    insideShared,
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

/** Zona waktu tunggal laporan Fire Alert — semua tanggal/jam dibaca sebagai WIB. */
const WIB = "Asia/Jakarta";

/**
 * Awal jendela waktu untuk label laporan.
 * - `1` = **bergulir** 1×24 jam ke belakang (perilaku layer 24 jam, #240).
 * - `5` = 5 hari **kalender termasuk hari ini** (batas FIRMS) → mundur 4 hari,
 *   supaya label rentangnya benar-benar 5 hari, bukan 6.
 */
export function hotspotWindowStart(now: Date, dayRange: number): Date {
  const back = dayRange <= 1 ? 1 : dayRange - 1;
  return new Date(now.getTime() - back * 24 * 60 * 60 * 1000);
}

/** Komponen hari/bulan/tahun sebuah Date menurut WIB (bukan zona browser). */
function wibDateParts(d: Date): { day: number; month: number; year: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: WIB,
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).formatToParts(d);
  const num = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { day: num("day"), month: num("month"), year: num("year") };
}

/**
 * "15–19 Agu 2026" (bentuk penuh bila lintas bulan/tahun) — selalu dibaca WIB
 * agar laporan tidak bergeser sehari untuk browser di luar zona Indonesia.
 */
export function formatHotspotRange(start: Date, end: Date): string {
  const full = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: WIB,
  });
  const a = wibDateParts(start);
  const b = wibDateParts(end);
  const sameMonth = a.month === b.month && a.year === b.year;
  return sameMonth ? `${a.day}–${full.format(end)}` : `${full.format(start)} – ${full.format(end)}`;
}

/** "19 Agu 2026, 14.55 WIB" — tanggal DAN jam sama-sama dibaca WIB. */
export function formatExportedAt(now: Date): string {
  const date = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: WIB }).format(now);
  const time = new Intl.DateTimeFormat("id-ID", { timeStyle: "short", timeZone: WIB }).format(now);
  return `${date}, ${time} WIB`;
}

/**
 * Rincian titik api DALAM boundary per distrik program, menghitung **titik
 * unik**: satu titik di boundary bersama (mis. KSJ & KBJ) hanya dihitung sekali
 * per distrik, sehingga jumlahnya cocok dengan kartu "Dalam Boundary" —
 * berbeda dari `countHotspotsByGroup` yang sengaja menghitung per pemilik.
 * (Satu titik yang boundary pemiliknya berbeda distrik tetap dihitung di tiap
 * distrik — kasus ini tidak ada pada data program saat ini.)
 */
export function countUniqueInsideByDistrict(
  classified: FeatureCollection,
  boundaries: FireBoundary[]
): AreaCount[] {
  const districtOfGroup = new Map<string, string>();
  const districtName = new Map<string, string>();
  for (const b of boundaries) {
    districtOfGroup.set(b.farmerGroupId, b.districtId);
    districtName.set(b.districtId, b.districtName);
  }
  const counts = new Map<string, number>([...districtName.keys()].map((id) => [id, 0]));
  for (const f of classified.features) {
    if (f.properties?.inBoundary !== "in") continue;
    const groupIds = (f.properties?.groupIds as string[] | undefined) ?? [];
    const districtIds = new Set(
      groupIds.map((id) => districtOfGroup.get(id)).filter((id): id is string => id !== undefined)
    );
    for (const id of districtIds) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([id, count]) => ({ name: districtName.get(id) ?? id, count }))
    .sort((a, b) => a.name.localeCompare(b.name, "id"));
}
