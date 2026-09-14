/**
 * Patok batas lahan (#329) — helper MURNI (tanpa Prisma/Next): konstanta,
 * label, penomoran vertex, dan perencanaan "Buat patok dari poligon".
 * Kueri DB-nya di `land-marker-query.ts`.
 */

/** Vertex ≤ jarak ini dari patok yang sudah ada DITAUTKAN, bukan dibuat baru (keputusan owner 2026-09-14). */
export const MARKER_SNAP_M = 5;
/** Koordinat patok wajib ≤ jarak ini dari batas lahan — guard lat/long tertukar / salah tempel desimal. */
export const MARKER_MAX_DISTANCE_M = 100;
/** Toleransi penyederhanaan ring (m) — vertex kolinear/berhimpit hasil digitasi lengkung tak jadi patok. */
export const MARKER_SIMPLIFY_M = 1;
/** Foto patok: jpg/png/webp ≤ 5 MB. */
export const MARKER_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const MARKER_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const LAND_MARKER_CONDITIONS = ["PRESENT", "MISSING", "DAMAGED", "NOT_INSTALLED"] as const;
export type LandMarkerConditionCode = (typeof LAND_MARKER_CONDITIONS)[number];
export const LAND_MARKER_CONDITION_LABELS: Record<LandMarkerConditionCode, string> = {
  PRESENT: "Ada",
  MISSING: "Hilang",
  DAMAGED: "Rusak",
  NOT_INSTALLED: "Belum dipasang",
};

export const LAND_MARKER_TYPES = ["CONCRETE", "WOOD", "PIPE", "NATURAL", "OTHER"] as const;
export type LandMarkerTypeCode = (typeof LAND_MARKER_TYPES)[number];
export const LAND_MARKER_TYPE_LABELS: Record<LandMarkerTypeCode, string> = {
  CONCRETE: "Beton",
  WOOD: "Kayu",
  PIPE: "Pipa",
  NATURAL: "Tanda alam",
  OTHER: "Lainnya",
};

export const LAND_MARKER_SOURCES = ["POLYGON_VERTEX", "GPS", "MANUAL"] as const;
export type LandMarkerSourceCode = (typeof LAND_MARKER_SOURCES)[number];
export const LAND_MARKER_SOURCE_LABELS: Record<LandMarkerSourceCode, string> = {
  POLYGON_VERTEX: "Vertex poligon",
  GPS: "GPS lapangan",
  MANUAL: "Manual",
};

export const labelOf = <K extends string>(map: Record<K, string>, code: string | null | undefined): string =>
  code ? (map[code as K] ?? code) : "—";

/** Meter → derajat di ekuator (Riau lintang 0–2°, galat < 0,1%). Sama dengan parcel-neighbor. */
export const metersToDegrees = (m: number) => m / 111_320;

export interface LonLat {
  lon: number;
  lat: number;
}

/** Jarak haversine (m) — duplikat kecil dari map-geo agar modul ini bebas impor klien. */
export function distanceMeters(a: LonLat, b: LonLat): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Urutkan vertex SEARAH JARUM JAM mulai dari yang paling utara (lintang
 * terbesar; seri → bujur terkecil). Deterministik — nomor patok sama di
 * layar, PDF, dan ekspor. Vertex penutup ganda dibuang oleh pemanggil.
 */
export function orderClockwiseFromNorth(points: LonLat[]): LonLat[] {
  if (points.length < 3) return [...points];
  const cx = points.reduce((s, p) => s + p.lon, 0) / points.length;
  const cy = points.reduce((s, p) => s + p.lat, 0) / points.length;
  // Sudut dari utara searah jarum jam: atan2(dx, dy) — utara = 0, timur = 90°.
  const angle = (p: LonLat) => {
    const a = (Math.atan2(p.lon - cx, p.lat - cy) * 180) / Math.PI;
    return (a + 360) % 360;
  };
  const sorted = [...points].sort((a, b) => angle(a) - angle(b) || b.lat - a.lat || a.lon - b.lon);
  // Mulai dari vertex paling utara — bukan sudut 0 persis (poligon miring bisa
  // punya vertex "utara" pada sudut kecil di kedua sisi).
  let start = 0;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].lat > sorted[start].lat || (sorted[i].lat === sorted[start].lat && sorted[i].lon < sorted[start].lon)) start = i;
  }
  return [...sorted.slice(start), ...sorted.slice(0, start)];
}

/** Patok yang sudah ada di sekitar vertex (hasil kueri). */
export interface NearbyMarker {
  id: string;
  lon: number;
  lat: number;
  /** ID Lahan yang sudah memakai patok ini (aktif). */
  parcelIds: string[];
  /** Sudah tertaut ke lahan yang sedang diproses. */
  linkedToThisParcel: boolean;
}

export interface MarkerCandidate {
  sequenceNo: number;
  lon: number;
  lat: number;
  /** Patok yang sudah ada ≤ MARKER_SNAP_M — akan DITAUTKAN, bukan dibuat. */
  existingMarkerId: string | null;
  /** ID Lahan lain yang memakai patok itu — konteks "patok bersama". */
  existingParcelIds: string[];
  /** Vertex sudah punya tautan aktif ke lahan ini → dilewati (idempoten). */
  alreadyLinked: boolean;
  /** Jarak vertex ke patok yang ada (m), null bila baru. */
  snapDistanceM: number | null;
}

/**
 * Rencanakan patok dari daftar vertex (sudah disederhanakan & diurutkan) dan
 * patok yang ada di sekitarnya. Murni & idempoten: dijalankan ulang → vertex
 * yang sudah tertaut dilewati, tidak pernah menggeser/menghapus patok lama.
 * Satu patok yang ada hanya dipakai oleh satu vertex (yang terdekat).
 */
export function planMarkersFromVertices(vertices: LonLat[], nearby: NearbyMarker[], snapM = MARKER_SNAP_M): MarkerCandidate[] {
  const ordered = orderClockwiseFromNorth(vertices);
  const used = new Set<string>();
  return ordered.map((v, i) => {
    let best: { m: NearbyMarker; d: number } | null = null;
    for (const m of nearby) {
      if (used.has(m.id)) continue;
      const d = distanceMeters(v, m);
      if (d <= snapM && (!best || d < best.d)) best = { m, d };
    }
    if (best) used.add(best.m.id);
    return {
      sequenceNo: i + 1,
      lon: v.lon,
      lat: v.lat,
      existingMarkerId: best?.m.id ?? null,
      existingParcelIds: best?.m.parcelIds ?? [],
      alreadyLinked: best?.m.linkedToThisParcel ?? false,
      snapDistanceM: best ? Math.round(best.d * 10) / 10 : null,
    };
  });
}

/**
 * Deteksi lat/long tertukar: bila titik jauh dari lahan tetapi versi tertukarnya
 * dekat, itu hampir pasti kesalahan kolom di GPS/Excel. Mengembalikan pesan
 * error yang menyebut perbaikannya, atau null bila titik sah.
 */
export function checkMarkerNearParcel(
  point: LonLat,
  distanceToBoundaryM: (p: LonLat) => number,
  maxM = MARKER_MAX_DISTANCE_M,
): string | null {
  const d = distanceToBoundaryM(point);
  if (d <= maxM) return null;
  const swapped = { lon: point.lat, lat: point.lon };
  const ds = distanceToBoundaryM(swapped);
  if (ds <= maxM) return `Koordinat ${Math.round(d)} m dari batas lahan — lat/long tampaknya tertukar (bila ditukar: ${Math.round(ds)} m)`;
  return `Koordinat ${Math.round(d)} m dari batas lahan (maks ${maxM} m) — periksa desimal/kolom`;
}

/** Format koordinat 6 desimal (≈ 0,1 m) — cukup untuk berkas STDB/SKT. */
export const fmtCoord = (n: number) => n.toFixed(6);
