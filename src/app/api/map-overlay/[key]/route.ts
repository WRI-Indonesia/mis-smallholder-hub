import https from "node:https";
import type { NextRequest } from "next/server";
import { MAP_OVERLAYS } from "@/app/(admin)/admin/map/parcel/map-overlays";

// Tile proxy for the "Peta Lainnya" reference overlays. Needed because the
// upstream SIGAP KLHK / Kementerian Kehutanan ArcGIS server (a) sends no CORS
// headers, so the browser blocks direct tile reads, and (b) serves an
// incomplete TLS certificate chain. Proxying server-side fixes both: the
// browser only talks to our same-origin endpoint.
//
// This is a deliberate, narrow exception to the "no REST API layer" rule — a
// binary image endpoint cannot be a Server Action (MapLibre needs a plain GET
// tile URL). Only whitelisted overlay keys are forwarded (no open proxy).

export const runtime = "nodejs";

const BBOX_RE = /^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/;
const TIMEOUT_MS = 20_000;

type UpstreamResult = { status: number; contentType: string; body: Buffer };

/** Fetch the upstream tile, tolerating the incomplete TLS chain (server-to-server only). */
function fetchTile(url: string): Promise<UpstreamResult> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { rejectUnauthorized: false, timeout: TIMEOUT_MS }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c) => chunks.push(c as Buffer));
      res.on("end", () =>
        resolve({
          status: res.statusCode ?? 502,
          contentType: (res.headers["content-type"] as string) ?? "image/png",
          body: Buffer.concat(chunks),
        })
      );
    });
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", reject);
  });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const overlay = MAP_OVERLAYS.find((o) => o.key === key);
  if (!overlay) return new Response("Unknown overlay", { status: 404 });

  const bbox = req.nextUrl.searchParams.get("bbox");
  if (!bbox || !BBOX_RE.test(bbox)) return new Response("Invalid bbox", { status: 400 });

  const upstream =
    `${overlay.service}/export?bbox=${bbox}&bboxSR=3857&imageSR=3857` +
    `&size=256,256&dpi=96&format=png32&transparent=true&f=image`;

  try {
    const res = await fetchTile(upstream);
    if (res.status !== 200 || !res.contentType.startsWith("image/")) {
      return new Response("Upstream error", { status: 502 });
    }
    return new Response(new Uint8Array(res.body), {
      status: 200,
      headers: {
        "Content-Type": res.contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch {
    return new Response("Fetch failed", { status: 502 });
  }
}
