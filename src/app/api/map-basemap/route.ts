import type { NextRequest } from "next/server";
import { hasPermission } from "@/lib/rbac";
import { rasterTileTemplate } from "@/lib/map-style";
import {
  BASEMAP_MAX_ZOOM,
  REPORT_BASEMAP_STYLE_KEY,
  type ReportBasemapTileKey,
} from "@/lib/report-basemap";

// Proxy tile basemap untuk **latar peta cetak Laporan Lahan** (#318).
//
// Peta cetak itu SVG/jsPDF, bukan MapLibre: latar harus dijahit sendiri ke satu
// canvas lalu di-`toDataURL`. Tile yang ditarik langsung dari penyedia
// men-taint canvas (lihat `IMAGERY_STYLE_KEYS` di map-style.ts), sehingga
// ekspor PDF & Excel gagal dengan `SecurityError`. Diproxy same-origin,
// masalah itu hilang.
//
// Pengecualian sempit yang sama dengan /api/map-overlay terhadap aturan "tanpa
// REST API": endpoint biner tak bisa jadi Server Action. Hanya tiga kunci
// ber-whitelist yang diteruskan, dan URL upstream dibaca dari `MAP_STYLES`
// (bukan disalin) supaya pergantian penyedia tetap satu suntingan.

export const runtime = "nodejs";

const TIMEOUT_MS = 20_000;

/**
 * OSM menolak/melambatkan klien tanpa User-Agent yang mengenali diri
 * (kebijakan tile.openstreetmap.org). Google tak keberatan menerimanya juga.
 */
const USER_AGENT = "SmallholderHubMIS/1.0 (+https://github.com/wri-indonesia)";

const isTileKey = (v: string): v is ReportBasemapTileKey =>
  Object.prototype.hasOwnProperty.call(REPORT_BASEMAP_STYLE_KEY, v);

/** Bilangan bulat non-negatif dalam rentang; `null` bila cacat. */
function intParam(raw: string | null, max: number): number | null {
  if (raw === null || !/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return n <= max ? n : null;
}

export async function GET(req: NextRequest) {
  // Guard permission halaman yang memakainya — endpoint tile bukan proxy anonim
  // (paritas /api/map-overlay & /api/map-hotspot).
  if (!(await hasPermission("report-land-parcel", "VIEW"))) {
    return new Response("Forbidden", { status: 403 });
  }

  const params = req.nextUrl.searchParams;
  const key = params.get("key") ?? "";
  if (!isTileKey(key)) return new Response("Unknown basemap", { status: 404 });

  const z = intParam(params.get("z"), BASEMAP_MAX_ZOOM);
  if (z === null) return new Response("Invalid z", { status: 400 });
  // x/y wajib di dalam grid zoom-nya — mencegah endpoint dipakai menembak
  // sembarang path di host upstream.
  const maxIndex = 2 ** z - 1;
  const x = intParam(params.get("x"), maxIndex);
  const y = intParam(params.get("y"), maxIndex);
  if (x === null || y === null) return new Response("Invalid tile", { status: 400 });

  const template = rasterTileTemplate(REPORT_BASEMAP_STYLE_KEY[key]);
  if (!template) return new Response("Basemap has no raster tiles", { status: 404 });

  const upstream = template
    .replace("{z}", String(z))
    .replace("{x}", String(x))
    .replace("{y}", String(y));

  try {
    const res = await fetch(upstream, {
      headers: { "User-Agent": USER_AGENT, Accept: "image/*" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const contentType = res.headers.get("content-type") ?? "";
    if (!res.ok || !contentType.startsWith("image/")) {
      return new Response("Upstream error", { status: 502 });
    }
    return new Response(await res.arrayBuffer(), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        // Tile basemap praktis tak berubah; cache panjang menahan ratusan
        // permintaan per ekspor grid agar tidak berulang tiap render preview.
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch {
    return new Response("Fetch failed", { status: 502 });
  }
}
