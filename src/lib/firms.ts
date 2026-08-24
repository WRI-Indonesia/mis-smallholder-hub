/**
 * Pure helpers for the NASA FIRMS active-fire proxy (`/api/map-hotspot`).
 * Kept free of Next/Node APIs so they can be unit-tested in isolation.
 */

import type { FeatureCollection, Feature } from "geojson";

/** Rentang UI yang diterima proxy: 24 jam (1), 5, 10, 30 hari. */
export const HOTSPOT_DAY_RANGES = [1, 5, 10, 30] as const;
export type HotspotDayRange = (typeof HOTSPOT_DAY_RANGES)[number];

/** Cap FIRMS: satu request area maksimal 5 hari ("Expects [1..5]"). */
const FIRMS_MAX_DAYS = 5;

/**
 * Satu request ke FIRMS Area API. `date` (YYYY-MM-DD, UTC) = hari pertama
 * jendela — bila kosong FIRMS mengembalikan "hari ini (UTC) mundur
 * dayRange-1 hari".
 */
export type UpstreamWindow = { dayRange: number; date?: string };

/** 00:00 UTC pada `days` hari sebelum tanggal UTC milik `now` (0 = hari ini UTC). */
export function utcMidnightDaysAgo(now: Date, days: number): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - days));
}

const utcDateString = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Rentang UI → daftar jendela FIRMS yang harus diambil (#284).
 * FIRMS membatasi 5 hari per request, tetapi parameter `DATE` membolehkan
 * jendela lampau — rentang panjang = beberapa jendela 5 hari berurutan,
 * digabung di proxy. Jendela **terbaru selalu tanpa `DATE`** (mengikuti
 * "hari ini" versi server FIRMS, kebal selisih jam; URL-nya pun sama dengan
 * opsi 5 hari sehingga cache-nya dipakai bersama); jendela lampau diberi
 * `DATE` dari tanggal **UTC** (satuan hari FIRMS), bukan `now − N×24 jam`.
 *
 * "24 jam" mengambil 2 hari UTC lalu klien memangkas ke 24 jam bergulir
 * (`processHotspots`); nilai lama `2` tetap diterima demi kompatibilitas
 * bundle pra-deploy. Null = rentang tak valid.
 */
export function upstreamWindows(dayRange: number, now: Date): UpstreamWindow[] | null {
  if (dayRange === 1 || dayRange === 2) return [{ dayRange: 2 }];
  if (!(HOTSPOT_DAY_RANGES as readonly number[]).includes(dayRange)) return null;
  const windows: UpstreamWindow[] = [];
  // Jendela lampau dari yang tertua: mulai hari ke-(N-1) sebelum hari ini UTC.
  for (let back = dayRange - 1; back >= FIRMS_MAX_DAYS; back -= FIRMS_MAX_DAYS) {
    windows.push({ dayRange: FIRMS_MAX_DAYS, date: utcDateString(utcMidnightDaysAgo(now, back)) });
  }
  windows.push({ dayRange: FIRMS_MAX_DAYS });
  return windows;
}

/**
 * Gabungkan hasil beberapa jendela menjadi satu FeatureCollection. Deteksi
 * yang sama (koordinat + waktu akuisisi + satelit) hanya masuk sekali —
 * berjaga bila dua jendela bertumpang tindih di batas hari UTC.
 */
export function mergeHotspotCollections(collections: FeatureCollection[]): FeatureCollection {
  const seen = new Set<string>();
  const features: Feature[] = [];
  for (const fc of collections) {
    for (const f of fc.features) {
      const [lon, lat] = f.geometry.type === "Point" ? f.geometry.coordinates : [NaN, NaN];
      const p = f.properties ?? {};
      const key = `${lon},${lat},${p.acqDate},${p.acqTime},${p.satellite}`;
      if (seen.has(key)) continue;
      seen.add(key);
      features.push(f);
    }
  }
  return { type: "FeatureCollection", features };
}

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
