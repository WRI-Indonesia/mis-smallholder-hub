/**
 * Pure geometry helpers for the Peta Lahan map: the ruler tool (distance/area)
 * and parcel-name label fitting. Kept free of React/MapLibre so they can be
 * unit-tested in isolation.
 */

const EARTH_RADIUS_M = 6371008.8; // mean Earth radius
const toRad = (d: number) => (d * Math.PI) / 180;

export const PARCEL_LABEL_FONT_PX = 10;

export type LngLat = [number, number];

/** Geodesic (haversine) distance in meters between two [lng, lat] points. */
export function haversineMeters(a: LngLat, b: LngLat): number {
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Total path length in meters across an ordered list of points. */
export function pathMeters(points: LngLat[]): number {
  let m = 0;
  for (let i = 1; i < points.length; i++) m += haversineMeters(points[i - 1], points[i]);
  return m;
}

/** Spherical polygon area in m² for a ring of [lng, lat] points (auto-closed). */
export function sphericalAreaM2(points: LngLat[]): number {
  if (points.length < 3) return 0;
  let total = 0;
  for (let i = 0; i < points.length; i++) {
    const [lng1, lat1] = points[i];
    const [lng2, lat2] = points[(i + 1) % points.length];
    total += toRad(lng2 - lng1) * (2 + Math.sin(toRad(lat1)) + Math.sin(toRad(lat2)));
  }
  return Math.abs((total * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2);
}

/** Human-readable distance: meters under 1 km, else kilometers. */
export function formatDistance(m: number): string {
  if (m < 1000) return `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(m)} m`;
  return `${new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(m / 1000)} km`;
}

/** Human-readable area: m² under 1 ha, ha under 1 km², else km². */
export function formatMeasureArea(m2: number): string {
  const nf = (v: number, d = 2) =>
    new Intl.NumberFormat("id-ID", { minimumFractionDigits: d, maximumFractionDigits: d }).format(v);
  if (m2 < 10_000) return `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(m2)} m²`;
  if (m2 < 1_000_000) return `${nf(m2 / 10_000)} ha`;
  return `${nf(m2 / 1_000_000)} km²`;
}

/** [minLng, minLat, maxLng, maxLat] of any polygon/multipolygon geometry, or null. */
export function geomBounds(geometry: unknown): [number, number, number, number] | null {
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  const walk = (c: unknown) => {
    if (!Array.isArray(c)) return;
    if (typeof c[0] === "number" && typeof c[1] === "number") {
      minLng = Math.min(minLng, c[0]); maxLng = Math.max(maxLng, c[0]);
      minLat = Math.min(minLat, c[1]); maxLat = Math.max(maxLat, c[1]);
    } else for (const x of c) walk(x);
  };
  const g = geometry as { coordinates?: unknown };
  if (!g || !("coordinates" in g)) return null;
  walk(g.coordinates);
  if (minLng === Infinity) return null;
  return [minLng, minLat, maxLng, maxLat];
}

/**
 * Decide whether a farmer name fits inside a parcel polygon at the given zoom,
 * wrapping across lines if needed. Returns the `text-max-width` (in ems) so
 * MapLibre wraps to the polygon width, or null if it can't fit (hide label).
 */
export function parcelLabelFit(
  name: string,
  bounds: [number, number, number, number],
  zoom: number
): { maxWidthEms: number } | null {
  const [minLng, minLat, maxLng, maxLat] = bounds;
  const lat = (minLat + maxLat) / 2;
  // Web Mercator ground resolution (m/px) at this latitude & zoom.
  const mpp = (156543.03392 * Math.cos(toRad(lat))) / Math.pow(2, zoom);
  const widthM = (maxLng - minLng) * 111320 * Math.cos(toRad(lat));
  const heightM = (maxLat - minLat) * 110574;
  const pxW = widthM / mpp;
  const pxH = heightM / mpp;

  const charW = PARCEL_LABEL_FONT_PX * 0.6; // approx Open Sans glyph advance
  const lineH = PARCEL_LABEL_FONT_PX * 1.25;
  const pad = 6;
  const maxChars = Math.floor((pxW - pad) / charW);
  if (maxChars < 3) return null;

  const words = name.trim().split(/\s+/);
  if (words.some((w) => w.length > maxChars)) return null; // a single word overflows

  // Greedy word-wrap to count lines.
  let lines = 1, cur = 0;
  for (const w of words) {
    const next = cur === 0 ? w.length : cur + 1 + w.length;
    if (next <= maxChars) cur = next;
    else { lines++; cur = w.length; }
  }
  if (lines * lineH > pxH - pad) return null; // too tall to fit

  return { maxWidthEms: Math.max(2, (maxChars * charW) / PARCEL_LABEL_FONT_PX) };
}
