/**
 * Fire-hotspot layer ("Titik Api") support: NASA FIRMS VIIRS 375 m active-fire
 * detections, fetched through our same-origin proxy (`/api/map-hotspot`) and
 * rendered as points on the Peta Lahan map. Session-only, not persisted.
 */

import type { FeatureCollection } from "geojson";

/** Time window for the FIRMS query: last 24 hours (1) or last 5 days (5).
 *  FIRMS caps a single area request at 5 days ("Expects [1..5]"). */
export type HotspotDayRange = 1 | 5;

export type HotspotState = {
  visible: boolean;
  dayRange: HotspotDayRange;
};

export const DEFAULT_HOTSPOT_STATE: HotspotState = {
  visible: false,
  dayRange: 1,
};

// Point styling by recency (age relative to "now").
export const HOTSPOT_RECENT_COLOR = "#ef4444"; // < 24 jam
export const HOTSPOT_OLDER_COLOR = "#f97316"; // 1–7 hari

/** Fixed query area: Riau province [west, south, east, north]. */
export const RIAU_BBOX: [number, number, number, number] = [100.0, -1.4, 104.7, 3.0];

const RECENT_MS = 24 * 60 * 60 * 1000;

/**
 * Fetch fire hotspots from the FIRMS proxy and tag each point with an
 * `ageBucket` ("recent" = <24 h, "older" = 1–7 hari), computed against the
 * caller-supplied `now` so MapLibre can color by recency via a static
 * expression instead of a runtime clock.
 */
export async function fetchHotspots(
  bbox: [number, number, number, number],
  dayRange: HotspotDayRange,
  now: number
): Promise<FeatureCollection> {
  const [w, s, e, n] = bbox;
  const res = await fetch(`/api/map-hotspot?bbox=${w},${s},${e},${n}&dayRange=${dayRange}`);
  if (!res.ok) throw new Error("Gagal memuat titik api");
  const fc = (await res.json()) as FeatureCollection;
  for (const f of fc.features) {
    const iso = f.properties?.acqDatetime as string | undefined;
    const t = iso ? Date.parse(iso) : NaN;
    const recent = Number.isFinite(t) && now - t <= RECENT_MS;
    f.properties = { ...(f.properties ?? {}), ageBucket: recent ? "recent" : "older" };
  }
  return fc;
}

