import type { NextRequest } from "next/server";
import { hasPermission } from "@/lib/rbac";
import { parseBbox, isFirmsCsv, csvToGeoJSON } from "@/lib/firms";

// Data proxy for the "Titik Api (Hotspot)" layer. Fetches active-fire detections
// from NASA FIRMS (VIIRS 375 m, near-real-time) and returns them as GeoJSON so
// MapLibre can render them as points on the Peta Lahan map.
//
// Proxying server-side is required to (a) keep FIRMS_MAP_KEY_FREE off the client
// and (b) sidestep CORS on the FIRMS endpoint. Like /api/map-overlay, this is a
// deliberate, narrow exception to the "no REST API layer" rule — MapLibre/Source
// needs a plain GET URL, which a Server Action cannot provide. Guarded by the
// same `map-parcel` VIEW permission as the page so it isn't an anonymous proxy.
//
// FIRMS area API:
//   https://firms.modaps.eosdis.nasa.gov/api/area/csv/[KEY]/[SOURCE]/[bbox]/[dayRange]
//   bbox = west,south,east,north (WGS84 lon/lat); dayRange = 1..5 days
//   (FIRMS caps a single request at 5 days — "Expects [1..5]").

export const runtime = "nodejs";

const FIRMS_BASE = "https://firms.modaps.eosdis.nasa.gov/api/area/csv";
const SOURCE = "VIIRS_SNPP_NRT";
const TIMEOUT_MS = 20_000;
// UI exposes only these two windows; both within the FIRMS [1..5] day cap.
const ALLOWED_DAY_RANGE = new Set([1, 5]);

export async function GET(req: NextRequest) {
  if (!(await hasPermission("map-parcel", "VIEW"))) {
    return new Response("Forbidden", { status: 403 });
  }

  const mapKey = process.env.FIRMS_MAP_KEY_FREE;
  if (!mapKey) return new Response("FIRMS_MAP_KEY_FREE tidak dikonfigurasi", { status: 500 });

  const bbox = parseBbox(req.nextUrl.searchParams.get("bbox"));
  if (!bbox) return new Response("Invalid bbox", { status: 400 });

  const dayRange = Number(req.nextUrl.searchParams.get("dayRange"));
  if (!ALLOWED_DAY_RANGE.has(dayRange)) return new Response("Invalid dayRange", { status: 400 });

  const upstream = `${FIRMS_BASE}/${mapKey}/${SOURCE}/${bbox}/${dayRange}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(upstream, {
      signal: controller.signal,
      // Cache upstream ~1 hour: FIRMS NRT has ~3 h latency, so finer polling
      // wastes the rate budget (~5000 transactions / 10 min per key).
      next: { revalidate: 3600 },
    });
    if (!res.ok) return new Response("Upstream error", { status: 502 });
    const csv = await res.text();
    // FIRMS returns a plain-text error (invalid key / bad range / over limit)
    // instead of CSV — detect by the expected header prefix.
    if (!isFirmsCsv(csv)) return new Response("Upstream error", { status: 502 });

    return Response.json(csvToGeoJSON(csv), {
      headers: { "Cache-Control": "public, max-age=1800, s-maxage=3600" },
    });
  } catch {
    return new Response("Fetch failed", { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
