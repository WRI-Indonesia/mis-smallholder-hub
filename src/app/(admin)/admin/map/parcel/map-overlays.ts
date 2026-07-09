/**
 * Reference map overlays for the "Peta Lainnya" panel section.
 *
 * These are third-party thematic maps (kawasan hutan, gambut, moratorium, dst.)
 * published by SIGAP KLHK / Kementerian Kehutanan as ArcGIS REST MapServer
 * services. We consume the dynamic `export` endpoint as XYZ-style raster tiles
 * so MapLibre can overlay them beneath the farmer data layers.
 */

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
