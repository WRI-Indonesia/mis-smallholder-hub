/**
 * Reference map overlays for the "Peta Lainnya" panel section.
 *
 * These are third-party thematic maps (kawasan hutan, gambut, moratorium, dst.)
 * published by SIGAP KLHK / Kementerian Kehutanan as ArcGIS REST MapServer
 * services. We consume the dynamic `export` endpoint as XYZ-style raster tiles
 * so MapLibre can overlay them beneath the farmer data layers.
 */

import type { FeatureCollection, Feature, Geometry } from "geojson";

const SIGAP_BASE =
  "https://geoportal.menlhk.go.id/server/rest/services/SIGAP_Interaktif";

export type OverlayDef = {
  key: string;
  label: string;
  description: string;
  /** Swatch color shown next to the toggle in the panel. */
  color: string;
  /** ArcGIS REST MapServer base URL. */
  service: string;
};

/** Ordered list of available overlays (top row = drawn on top). */
export const MAP_OVERLAYS: OverlayDef[] = [
  {
    key: "kawasanHutan",
    label: "Kawasan Hutan",
    description: "Penunjukan kawasan hutan (HK/HL/HP/HPT/HPK/APL)",
    color: "#16a34a",
    service: `${SIGAP_BASE}/Kawasan_Hutan/MapServer`,
  },
  {
    key: "pelepasanKawasanHutan",
    label: "Pelepasan Kawasan Hutan",
    description: "Areal pelepasan kawasan hutan untuk penggunaan lain",
    color: "#f97316",
    service: `${SIGAP_BASE}/Pelepasan_Kawasan_Hutan/MapServer`,
  },
  {
    key: "gambut",
    label: "Fungsi Ekosistem Gambut",
    description: "Fungsi lindung & budidaya ekosistem gambut",
    color: "#92400e",
    service: `${SIGAP_BASE}/Fungsi_Ekosistem_Gambut/MapServer`,
  },
  {
    key: "pippib",
    label: "PIPPIB (Moratorium)",
    description: "Indikatif penghentian izin baru 2023 Periode II",
    color: "#dc2626",
    service: `${SIGAP_BASE}/PIPPIB_2023_Periode_2/MapServer`,
  },
  {
    key: "tutupanLahan",
    label: "Penutupan Lahan 2022",
    description: "Kelas penutupan/tutupan lahan nasional 2022",
    color: "#0ea5e9",
    service: `${SIGAP_BASE}/Penutupan_Lahan_2022/MapServer`,
  },
];

/**
 * Raster tile URL template for MapLibre, pointing at our same-origin proxy
 * (`/api/map-overlay/[key]`). `{bbox-epsg-3857}` is substituted by MapLibre with
 * each tile's Web Mercator extent; the proxy forwards it to the upstream ArcGIS
 * `export` endpoint. Proxying is required because the upstream server sends no
 * CORS headers and an incomplete TLS chain — see the route handler.
 */
export function overlayTileUrl(key: string): string {
  return `/api/map-overlay/${key}?bbox={bbox-epsg-3857}`;
}

export type OverlayState = {
  /** Per-overlay visibility, keyed by OverlayDef.key. */
  visible: Record<string, boolean>;
  /** Shared opacity for all active overlays (0.1–1). */
  opacity: number;
};

export const DEFAULT_OVERLAY_STATE: OverlayState = {
  visible: {},
  opacity: 0.7,
};

// ---------------------------------------------------------------------------
// User-added GIS layers ("Tambah Data GIS Lain") — session-only, not persisted.
// ---------------------------------------------------------------------------

/** A layer added by the user at runtime: a WMS/tile URL or a parsed vector set. */
export type CustomLayer = {
  id: string;
  name: string;
  /** Swatch / vector styling color. */
  color: string;
  visible: boolean;
} & (
    | { kind: "wms"; tileUrl: string }
    | { kind: "vector"; data: FeatureCollection }
  );

/** Palette cycled for user-added layers so each is visually distinct. */
export const CUSTOM_LAYER_COLORS = [
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f59e0b",
  "#6366f1",
  "#ef4444",
];

/**
 * Build a MapLibre raster tile URL from a user-provided WMS endpoint. If the
 * URL is already a tile template (contains `{z}` or `{bbox...}`), it is used
 * as-is; otherwise standard WMS 1.1.1 GetMap params are appended with the
 * `{bbox-epsg-3857}` token.
 */
export function buildWmsTileUrl(url: string, layers: string): string {
  if (/\{(z|bbox)/i.test(url)) return url;
  const sep = url.includes("?") ? "&" : "?";
  const params =
    `service=WMS&request=GetMap&version=1.1.1` +
    `&layers=${encodeURIComponent(layers)}&styles=` +
    `&format=image/png&transparent=true&srs=EPSG:3857` +
    `&width=256&height=256&bbox={bbox-epsg-3857}`;
  return `${url}${sep}${params}`;
}

/** Normalize any GeoJSON object (FeatureCollection/Feature/Geometry) into a FeatureCollection. */
export function toFeatureCollection(raw: unknown): FeatureCollection {
  const obj = raw as { type?: string; features?: unknown; geometry?: unknown };
  if (!obj || typeof obj !== "object" || !obj.type) {
    throw new Error("Bukan objek GeoJSON yang valid");
  }
  if (obj.type === "FeatureCollection") {
    if (!Array.isArray(obj.features)) throw new Error("FeatureCollection tanpa 'features'");
    return raw as FeatureCollection;
  }
  if (obj.type === "Feature") {
    return { type: "FeatureCollection", features: [raw as Feature] };
  }
  // Bare geometry → wrap as a single feature.
  return {
    type: "FeatureCollection",
    features: [{ type: "Feature", properties: {}, geometry: raw as Geometry }],
  };
}

/** Bounding box of a FeatureCollection as [[minLng,minLat],[maxLng,maxLat]], or null if empty. */
export function geojsonBounds(
  fc: FeatureCollection
): [[number, number], [number, number]] | null {
  let minLng = Infinity,
    minLat = Infinity,
    maxLng = -Infinity,
    maxLat = -Infinity;
  const walk = (coords: unknown) => {
    if (Array.isArray(coords)) {
      if (typeof coords[0] === "number" && typeof coords[1] === "number") {
        const [lng, lat] = coords as [number, number];
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
      } else {
        for (const c of coords) walk(c);
      }
    }
  };
  for (const f of fc.features) {
    if (f.geometry && "coordinates" in f.geometry) walk(f.geometry.coordinates);
  }
  if (minLng === Infinity) return null;
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}
