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
 * digabung di proxy. **Semua** jendela ≥5 hari diberi `DATE` dari tanggal
 * **UTC** server (satuan hari FIRMS), termasuk jendela terbaru (#285): jendela
 * tanpa `DATE` mengikuti "hari ini" versi FIRMS, dan bila itu berbeda dari
 * tanggal UTC server (jam server terlambat melewati 00:00 UTC, respons lama
 * dari cache) satu hari bisa hilang diam-diam padahal label tetap utuh.
 * Ber-`DATE` semua → cakupan deterministik = `hotspotWindowStart`. Opsi 5
 * hari menghasilkan URL yang sama dengan jendela terbaru 10/30 hari, jadi
 * cache-nya tetap dipakai bersama.
 *
 * Semantik `DATE` = hari **pertama** jendela (`DATE … DATE+dayRange-1`) —
 * diverifikasi live 2026-08-24: `…/5/2026-08-15` → acq_date 15–19 Agu.
 * Perintah cek ulang ada di docs/standards/ui-ux.md §Titik Api.
 *
 * "24 jam" mengambil 2 hari UTC tanpa `DATE` lalu klien memangkas ke 24 jam
 * bergulir (`processHotspots`); nilai lama `2` tetap diterima demi
 * kompatibilitas bundle pra-deploy. Null = rentang tak valid.
 */
export function upstreamWindows(dayRange: number, now: Date): UpstreamWindow[] | null {
  if (dayRange === 1 || dayRange === 2) return [{ dayRange: 2 }];
  if (!(HOTSPOT_DAY_RANGES as readonly number[]).includes(dayRange)) return null;
  // Rentang ≥5 wajib kelipatan 5 (dijaga test) — jendela terakhir pasti
  // berakhir tepat hari ini UTC tanpa perlu dipangkas.
  const windows: UpstreamWindow[] = [];
  for (let back = dayRange - 1; back >= 0; back -= FIRMS_MAX_DAYS) {
    windows.push({ dayRange: FIRMS_MAX_DAYS, date: utcDateString(utcMidnightDaysAgo(now, back)) });
  }
  return windows;
}

/**
 * Gabungkan hasil beberapa jendela menjadi satu FeatureCollection. Deteksi
 * yang sama (koordinat + waktu akuisisi + satelit) hanya masuk sekali —
 * berjaga bila dua jendela bertumpang tindih di batas hari UTC; pada
 * tabrakan, salinan dari jendela **terakhir** (lebih baru) yang dipakai
 * karena FIRMS NRT bisa merevisi atribut. Fitur non-Point (tak pernah
 * dihasilkan `csvToGeoJSON`) diteruskan apa adanya, bukan saling menelan.
 */
export function mergeHotspotCollections(collections: FeatureCollection[]): FeatureCollection {
  const byKey = new Map<string, Feature>();
  const passthrough: Feature[] = [];
  for (const fc of collections) {
    for (const f of fc.features) {
      if (f.geometry.type !== "Point") {
        passthrough.push(f);
        continue;
      }
      const [lon, lat] = f.geometry.coordinates;
      const p = f.properties ?? {};
      byKey.set(`${lon},${lat},${p.acqDate},${p.acqTime},${p.satellite}`, f);
    }
  }
  return { type: "FeatureCollection", features: [...byKey.values(), ...passthrough] };
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
