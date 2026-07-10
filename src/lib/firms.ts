/**
 * Pure helpers for the NASA FIRMS active-fire proxy (`/api/map-hotspot`).
 * Kept free of Next/Node APIs so they can be unit-tested in isolation.
 */

import type { FeatureCollection, Feature } from "geojson";

/** Validate a WGS84 "west,south,east,north" bbox string; returns normalized string or null. */
export function parseBbox(raw: string | null): string | null {
  if (!raw) return null;
  const parts = raw.split(",").map((n) => Number(n));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  const [w, s, e, n] = parts;
  if (w < -180 || e > 180 || w >= e) return null;
  if (s < -90 || n > 90 || s >= n) return null;
  return `${w},${s},${e},${n}`;
}

/** Build an ISO-8601 UTC timestamp from FIRMS acq_date (YYYY-MM-DD) + acq_time (HMM/HHMM, UTC). */
export function acqDatetime(date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const hhmm = time.padStart(4, "0");
  return `${date}T${hhmm.slice(0, 2)}:${hhmm.slice(2, 4)}:00Z`;
}

/** True if the text looks like a FIRMS CSV response (vs a plain-text error page). */
export function isFirmsCsv(csv: string): boolean {
  return csv.startsWith("latitude") || csv.startsWith("country_id");
}

/** Parse FIRMS CSV text into a GeoJSON FeatureCollection of fire points. */
export function csvToGeoJSON(csv: string): FeatureCollection {
  const lines = csv.trim().split(/\r?\n/);
  const features: Feature[] = [];
  if (lines.length < 2) return { type: "FeatureCollection", features };

  const header = lines[0].split(",");
  const idx = (name: string) => header.indexOf(name);
  const iLat = idx("latitude");
  const iLon = idx("longitude");
  const iDate = idx("acq_date");
  const iTime = idx("acq_time");
  const iSat = idx("satellite");
  const iConf = idx("confidence");
  const iFrp = idx("frp");
  const iBright = idx("bright_ti4");
  const iDayNight = idx("daynight");
  if (iLat < 0 || iLon < 0) return { type: "FeatureCollection", features };

  for (let r = 1; r < lines.length; r++) {
    const cols = lines[r].split(",");
    const lat = Number(cols[iLat]);
    const lon = Number(cols[iLon]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const acqDate = cols[iDate] ?? "";
    const acqTime = cols[iTime] ?? "";
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [lon, lat] },
      properties: {
        acqDate,
        acqTime,
        acqDatetime: acqDatetime(acqDate, acqTime),
        satellite: iSat >= 0 ? cols[iSat] : null,
        confidence: iConf >= 0 ? cols[iConf] : null,
        frp: iFrp >= 0 ? Number(cols[iFrp]) : null,
        brightness: iBright >= 0 ? Number(cols[iBright]) : null,
        daynight: iDayNight >= 0 ? cols[iDayNight] : null,
      },
    });
  }
  return { type: "FeatureCollection", features };
}
