/**
 * Reference map overlays for the "Peta Lainnya" panel section.
 *
 * These are third-party thematic maps served as ArcGIS REST MapServer
 * services. We consume the dynamic `export` endpoint as XYZ-style raster tiles
 * so MapLibre can overlay them beneath the farmer data layers.
 *
 * Source history: originally SIGAP KLHK (geoportal.menlhk.go.id). After the
 * ministry split into Kemenhut + KLH, the old domain was removed from DNS
 * (2026) and the services scattered: Kawasan Hutan now lives at
 * geoportal.planologi.kehutanan.go.id (Peta Interaktif 2026), while Fungsi
 * Ekosistem Gambut is no longer public at Kemenhut/KLH — we use the official
 * copy on Satu Peta BIG (kspservices.big.go.id).
 */

import type { FeatureCollection, Feature, Geometry } from "geojson";

export type OverlayDef = {
  key: string;
  label: string;
  description: string;
  /** Swatch color shown next to the toggle in the panel. */
  color: string;
  /** ArcGIS REST MapServer base URL. */
  service: string;
  /**
   * Optional ArcGIS `layers` param for the export request (e.g. "show:48")
   * when the MapServer bundles many layers and only some should be drawn.
   */
  exportLayers?: string;
  /** Attribution line shown under the toggle when the overlay is active. */
  source: string;
  /** Legend entries (fill colors from the upstream renderer), shown when active. */
  legend: { color: string; label: string }[];
};

/** Ordered list of available overlays (top row = drawn on top). */
export const MAP_OVERLAYS: OverlayDef[] = [
  {
    key: "kawasanHutan",
    label: "Kawasan Hutan",
    description: "Penunjukan kawasan hutan (HK/HL/HP/HPT/HPK/APL)",
    color: "#16a34a",
    service:
      "https://geoportal.planologi.kehutanan.go.id/server/rest/services/Peta_Interaktif_2026/KWSHUTAN_AR_250K/MapServer",
    source:
      "Kementerian Kehutanan — Geoportal Planologi, Peta Kawasan Hutan 1:250.000 (Des 2025)",
    legend: [
      { color: "#ad3fff", label: "Kawasan Konservasi (HK)" },
      { color: "#02ad00", label: "Hutan Lindung (HL)" },
      { color: "#8af200", label: "Hutan Produksi Terbatas (HPT)" },
      { color: "#ffff00", label: "Hutan Produksi Tetap (HP)" },
      { color: "#ff5eff", label: "Hutan Produksi Konversi (HPK)" },
      { color: "#ffffff", label: "Area Penggunaan Lain (APL)" },
      { color: "#00c5ff", label: "Tubuh Air" },
    ],
  },
  {
    key: "gambut",
    label: "Fungsi Ekosistem Gambut",
    description: "Fungsi lindung & budidaya ekosistem gambut",
    color: "#92400e",
    service:
      "https://kspservices.big.go.id/satupeta/rest/services/PUBLIK/SUMBER_DAYA_ALAM_DAN_LINGKUNGAN/MapServer",
    exportLayers: "show:48",
    source:
      "Satu Peta BIG / KLH, Peta Fungsi Ekosistem Gambut 1:50.000",
    legend: [
      { color: "#38a800", label: "Fungsi Lindung Ekosistem Gambut" },
      { color: "#ffff73", label: "Fungsi Budidaya Ekosistem Gambut" },
    ],
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
