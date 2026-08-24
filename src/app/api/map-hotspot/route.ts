import type { NextRequest } from "next/server";
import { hasPermission } from "@/lib/rbac";
import {
  parseBbox,
  isFirmsCsv,
  csvToGeoJSON,
  upstreamWindows,
  mergeHotspotCollections,
  type UpstreamWindow,
} from "@/lib/firms";

// Data proxy for the "Titik Api (Hotspot)" layer. Fetches active-fire detections
// from NASA FIRMS (VIIRS 375 m, near-real-time) and returns them as GeoJSON so
// MapLibre can render them as points on the Peta Lahan map.
//
// Proxying server-side is required to (a) keep FIRMS_MAP_KEY_FREE off the client
// and (b) sidestep CORS on the FIRMS endpoint. Like /api/map-overlay, this is a
// deliberate, narrow exception to the "no REST API layer" rule — MapLibre/Source
// needs a plain GET URL, which a Server Action cannot provide. Guarded by the
// VIEW permission of either consuming page (Peta Lahan / Dashboard Fire Alert)
// so it isn't an anonymous proxy.
//
// FIRMS area API:
//   https://firms.modaps.eosdis.nasa.gov/api/area/csv/[KEY]/[SOURCE]/[bbox]/[dayRange]
//   https://firms.modaps.eosdis.nasa.gov/api/area/csv/[KEY]/[SOURCE]/[bbox]/[dayRange]/[YYYY-MM-DD]
//   bbox = west,south,east,north (WGS84 lon/lat); dayRange = 1..5 days per
//   request ("Expects [1..5]"). Rentang UI 10/30 hari = beberapa jendela 5 hari
//   ber-DATE yang diambil paralel lalu digabung (#284) — pemecahnya di
//   `upstreamWindows` (lib/firms.ts), sumber yang sama dipakai klien.

export const runtime = "nodejs";

const FIRMS_BASE = "https://firms.modaps.eosdis.nasa.gov/api/area/csv";
const SOURCE = "VIIRS_SNPP_NRT";
// Satu jendela biasanya 1–3 s, pernah 7 s; jendela-jendela diambil paralel
// sehingga batas ini berlaku untuk yang paling lambat, bukan jumlahnya.
const TIMEOUT_MS = 30_000;
// Jendela terbaru: FIRMS NRT berjeda ~3 jam, polling lebih rapat cuma
// membakar kuota (~5000 transaksi / 10 menit per key). Jendela lampau
// (ber-DATE, berakhir ≥5 hari lalu) praktis beku → cache lebih lama, sehingga
// opsi 30 hari hanya menyegarkan satu jendela per jam.
const REVALIDATE_LATEST_S = 3600;
const REVALIDATE_PAST_S = 6 * 3600;

export async function GET(req: NextRequest) {
  // Dua halaman memakai proxy ini: Peta Lahan dan Dashboard Fire Alert (#266).
  // Cukup salah satu izin VIEW — dicek berurutan agar pemegang map-parcel
  // (kasus umum) tidak membayar query permission kedua.
  if (
    !(await hasPermission("map-parcel", "VIEW")) &&
    !(await hasPermission("dashboard-risk-fire", "VIEW"))
  ) {
    return new Response("Forbidden", { status: 403 });
  }

  const mapKey = process.env.FIRMS_MAP_KEY_FREE;
  if (!mapKey) return new Response("FIRMS_MAP_KEY_FREE tidak dikonfigurasi", { status: 500 });

  const bbox = parseBbox(req.nextUrl.searchParams.get("bbox"));
  if (!bbox) return new Response("Invalid bbox", { status: 400 });

  const windows = upstreamWindows(Number(req.nextUrl.searchParams.get("dayRange")), new Date());
  if (windows === null) return new Response("Invalid dayRange", { status: 400 });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const fetchWindow = async (w: UpstreamWindow) => {
    const upstream =
      `${FIRMS_BASE}/${mapKey}/${SOURCE}/${bbox}/${w.dayRange}` + (w.date ? `/${w.date}` : "");
    const res = await fetch(upstream, {
      signal: controller.signal,
      next: { revalidate: w.date ? REVALIDATE_PAST_S : REVALIDATE_LATEST_S },
    });
    if (!res.ok) throw new Error("Upstream error");
    const csv = await res.text();
    // FIRMS returns a plain-text error (invalid key / bad range / over limit)
    // instead of CSV — detect by the expected header prefix.
    if (!isFirmsCsv(csv)) throw new Error("Upstream error");
    return csvToGeoJSON(csv);
  };

  try {
    // Satu jendela gagal = seluruh permintaan gagal. Mengembalikan sebagian
    // akan tampil sebagai "rentang 30 hari" yang diam-diam bolong.
    const parts = await Promise.all(windows.map(fetchWindow));
    return Response.json(mergeHotspotCollections(parts), {
      headers: { "Cache-Control": "public, max-age=1800, s-maxage=3600" },
    });
  } catch {
    controller.abort();
    return new Response("Upstream error", { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
