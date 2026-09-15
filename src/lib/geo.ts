/**
 * Geodesi dasar bersama — satu implementasi haversine untuk penggaris Peta
 * Lahan (`map-geo.ts`) dan snap/epsilon patok (`land-marker.ts`). Sebelumnya
 * dua salinan dengan jari-jari Bumi berbeda (6.371.000 vs 6.371.008,8 m)
 * sehingga keputusan ≤ 5 m / ≤ 20 cm bisa berselisih milimeter dari alat ukur
 * di layar (review 2026-09-15). Bebas React/MapLibre.
 */

/** Jari-jari rata-rata Bumi (m). */
export const EARTH_RADIUS_M = 6371008.8;

export const toRad = (d: number) => (d * Math.PI) / 180;

/** Jarak haversine (m) antara dua titik `[lng, lat]`. */
export function haversineMeters(a: readonly [number, number], b: readonly [number, number]): number {
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}
