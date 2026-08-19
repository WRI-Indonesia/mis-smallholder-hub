/**
 * Fire-hotspot layer ("Titik Api") support: NASA FIRMS VIIRS 375 m active-fire
 * detections, fetched through our same-origin proxy (`/api/map-hotspot`) and
 * rendered as points on the Peta Lahan map. Session-only, not persisted.
 */

import type { FeatureCollection } from "geojson";
import { upstreamDayRange } from "@/lib/firms";

/** UI time window: rolling last 24 hours (1) or last 5 days (5).
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

/** Label rentang UI: "24 jam" / "5 hari" (dedup #241 — panel, ringkasan, PDF).
 *  Konteks kalimat ("… terakhir") ditambah pemakainya. */
export const hotspotWindowLabel = (dayRange: HotspotDayRange) =>
  dayRange === 1 ? "24 jam" : "5 hari";

// Point styling + legend breakdown by VIIRS detection confidence.
// Deliberately spread in hue AND lightness (dark red / orange / bright yellow)
// so the three classes stay distinguishable at small point sizes.
export const HOTSPOT_CONF_COLORS = {
  high: "#b91c1c",
  nominal: "#f97316",
  low: "#facc15",
} as const;
export type HotspotConfBucket = keyof typeof HOTSPOT_CONF_COLORS;

export const HOTSPOT_CONF_LABELS: Record<HotspotConfBucket, string> = {
  high: "Tinggi",
  nominal: "Nominal (Medium)",
  low: "Rendah",
};

/** Format a FIRMS acquisition timestamp (UTC ISO) as local Jakarta time. */
export function formatWib(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return (
    new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Jakarta",
    }).format(d) + " WIB"
  );
}

/** VIIRS confidence codes (l/n/h) → Bahasa labels; pass through anything else. */
export function confidenceLabel(v: unknown) {
  const s = String(v ?? "").toLowerCase();
  if (s === "l") return "Rendah";
  if (s === "n") return "Nominal (Medium)";
  if (s === "h") return "Tinggi";
  return v == null || v === "" ? "—" : String(v);
}

/** FIRMS satellite code → readable name (VIIRS S-NPP / NOAA-20). */
export function satelliteLabel(v: unknown) {
  const s = String(v ?? "").toUpperCase();
  if (s === "N") return "Suomi NPP";
  if (s === "1" || s === "NOAA-20") return "NOAA-20";
  return v == null || v === "" ? "—" : String(v);
}

/** Fixed query area: Riau province [west, south, east, north]. */
export const RIAU_BBOX: [number, number, number, number] = [100.0, -1.4, 104.7, 3.0];

const RECENT_MS = 24 * 60 * 60 * 1000;

/** VIIRS confidence code (l/n/h) → bucket; unknown values count as nominal. */
export function confidenceBucket(v: unknown): HotspotConfBucket {
  const s = String(v ?? "").toLowerCase();
  if (s === "h" || s === "high") return "high";
  if (s === "l" || s === "low") return "low";
  return "nominal";
}

/**
 * Post-process a FIRMS FeatureCollection for rendering:
 * - tag each point with `ageBucket` ("recent" = <24 h, "older") and
 *   `confBucket` ("high"/"nominal"/"low") so MapLibre can color via static
 *   expressions instead of a runtime clock;
 * - for the 24-hour window, keep only points detected within the last 24 h
 *   of `now` (FIRMS day ranges are whole UTC days, so the upstream fetch
 *   grabs 2 days and this trims them to a rolling window).
 */
export function processHotspots(
  fc: FeatureCollection,
  dayRange: HotspotDayRange,
  now: number
): FeatureCollection {
  const features = [];
  for (const f of fc.features) {
    const iso = f.properties?.acqDatetime as string | undefined;
    const t = iso ? Date.parse(iso) : NaN;
    const recent = Number.isFinite(t) && now - t <= RECENT_MS;
    if (dayRange === 1 && !recent) continue;
    features.push({
      ...f,
      properties: {
        ...(f.properties ?? {}),
        ageBucket: recent ? "recent" : "older",
        confBucket: confidenceBucket(f.properties?.confidence),
      },
    });
  }
  return { type: "FeatureCollection", features };
}

/** Count points per confidence bucket for the legend breakdown. */
export function countByConfidence(
  fc: FeatureCollection | null
): Record<HotspotConfBucket, number> {
  const counts: Record<HotspotConfBucket, number> = { high: 0, nominal: 0, low: 0 };
  if (!fc) return counts;
  for (const f of fc.features) {
    const b = f.properties?.confBucket as HotspotConfBucket | undefined;
    if (b && b in counts) counts[b]++;
  }
  return counts;
}

/**
 * Fetch fire hotspots from the FIRMS proxy for the given UI window.
 * FIRMS counts day ranges in whole UTC days, so "24 jam" fetches 2 days and
 * `processHotspots` trims to a rolling 24-hour window against `now` — with
 * dayRange=1 the current UTC day is often near-empty in WIB daytime (VIIRS
 * passes ~13.30 local + ±3 h NRT latency), which showed a misleading 0.
 */
export async function fetchHotspots(
  bbox: [number, number, number, number],
  dayRange: HotspotDayRange,
  now: number,
  signal?: AbortSignal
): Promise<FeatureCollection> {
  const [w, s, e, n] = bbox;
  const upstreamDays = upstreamDayRange(dayRange) ?? dayRange;
  const res = await fetch(`/api/map-hotspot?bbox=${w},${s},${e},${n}&dayRange=${upstreamDays}`, {
    signal,
  });
  if (!res.ok) throw new Error("Gagal memuat titik api");
  const fc = (await res.json()) as FeatureCollection;
  return processHotspots(fc, dayRange, now);
}
