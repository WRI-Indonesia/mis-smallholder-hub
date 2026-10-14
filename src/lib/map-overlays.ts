/**
 * Reference map overlays for the "Peta Lainnya" panel section — shared by Peta
 * Lahan and Peta Supply Chain (#433), and by the `/api/map-overlay` proxy
 * whitelist.
 *
 * Two kinds of source:
 *
 * - **arcgis** — government ArcGIS REST MapServer services (Kemenhut geoportal,
 *   Satu Peta BIG). We consume the dynamic `export` endpoint as bbox tiles
 *   through our same-origin proxy, because those servers send no CORS headers
 *   and an incomplete TLS chain (see the route handler).
 * - **xyz** — Global Forest Watch tile cache (`tiles.globalforestwatch.org`).
 *   It sends `Access-Control-Allow-Origin: *`, so MapLibre loads it directly,
 *   like the Google/Esri basemaps (exception noted in docs/standards/ui-ux-map.md).
 *   URLs use `latest`: GFW retires old dataset versions (v1.9.1 of tree cover
 *   loss answered 422 by 2026-10), and `latest` 307-redirects to the current
 *   version with the query string intact.
 *
 * Source history (arcgis): originally SIGAP KLHK (geoportal.menlhk.go.id).
 * After the ministry split into Kemenhut + KLH, the old domain was removed from
 * DNS (2026) and the services scattered: Kawasan Hutan, Penutupan Lahan,
 * Deforestasi and PIPPIB now live at geoportal.planologi.kehutanan.go.id
 * (Peta Interaktif 2026), while Fungsi Ekosistem Gambut is no longer public at
 * Kemenhut/KLH — we use the official copy on Satu Peta BIG
 * (kspservices.big.go.id).
 */

export type OverlayGroup = "kemenhut" | "gfw";

export const OVERLAY_GROUP_LABELS: Record<OverlayGroup, string> = {
  kemenhut: "Kemenhut / BIG",
  gfw: "EUDR (Global Forest Watch)",
};

type OverlayBase = {
  key: string;
  group: OverlayGroup;
  label: string;
  description: string;
  /** Swatch color shown next to the toggle in the panel. */
  color: string;
  /**
   * `change` = deforestation/loss/alert layers (small patches), drawn above
   * every `area` layer (cover/zoning polygons) so they are never hidden.
   */
  tier: "area" | "change";
  /** Attribution line shown under the toggle when the overlay is active. */
  source: string;
  /** Legend entries (colors from the upstream renderer), shown when active. */
  legend: { color: string; label: string }[];
  /** Caveat shown under the legend when active (e.g. alerts ≠ confirmed deforestation). */
  note?: string;
};

export type OverlayDef = OverlayBase &
  (
    | {
        kind: "arcgis";
        /** ArcGIS REST MapServer base URL. */
        service: string;
        /**
         * Optional ArcGIS `layers` param for the export request (e.g. "show:48")
         * when the MapServer bundles many layers and only some should be drawn.
         */
        exportLayers?: string;
      }
    | {
        kind: "xyz";
        /** Direct XYZ tile template (`{z}/{x}/{y}`), loaded by MapLibre without the proxy. */
        tiles: string;
      }
  );

export type ArcgisOverlayDef = Extract<OverlayDef, { kind: "arcgis" }>;

const KEMENHUT =
  "https://geoportal.planologi.kehutanan.go.id/server/rest/services/Peta_Interaktif_2026";
const KEMENHUT_SOURCE =
  "Direktorat IPSDH, Ditjen Planologi Kehutanan, Kementerian Kehutanan — Geoportal Planologi";
const GFW = "https://tiles.globalforestwatch.org";

/** Ordered list of available overlays, in panel order (grouped by `group`). */
export const MAP_OVERLAYS: OverlayDef[] = [
  {
    key: "kawasanHutan",
    group: "kemenhut",
    kind: "arcgis",
    tier: "area",
    label: "Kawasan Hutan",
    description: "Penunjukan kawasan hutan (HK/HL/HP/HPT/HPK/APL)",
    color: "#16a34a",
    service: `${KEMENHUT}/KWSHUTAN_AR_250K/MapServer`,
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
    group: "kemenhut",
    kind: "arcgis",
    tier: "area",
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
  {
    key: "penutupanLahan",
    group: "kemenhut",
    kind: "arcgis",
    tier: "area",
    label: "Penutupan Lahan 2025",
    description: "Kelas hutan & non-hutan hasil penafsiran citra 2025",
    color: "#60e663",
    service: `${KEMENHUT}/PL_AR_250K/MapServer`,
    source: `${KEMENHUT_SOURCE}, Penutupan Lahan 2025 1:50.000`,
    // Ringkasan renderer upstream (23 kelas): kelas hutan lengkap, non-hutan
    // yang umum di Riau; kelas berarsir (Sawah, Tanah Terbuka) diberi abu-abu.
    legend: [
      { color: "#60e663", label: "Hutan Lahan Kering Primer" },
      { color: "#72ff00", label: "Hutan Lahan Kering Sekunder" },
      { color: "#48ae4b", label: "Hutan Rawa Primer" },
      { color: "#56c100", label: "Hutan Rawa Sekunder" },
      { color: "#8ea704", label: "Hutan Mangrove Primer" },
      { color: "#c1a700", label: "Hutan Mangrove Sekunder" },
      { color: "#d3e598", label: "Hutan Tanaman Industri (HTI)" },
      { color: "#e5d298", label: "Perkebunan" },
      { color: "#ebc0a7", label: "Semak/Belukar" },
      { color: "#b1917e", label: "Semak/Belukar Rawa" },
      { color: "#f6fea7", label: "Pertanian Lahan Kering" },
      { color: "#edf500", label: "Pertanian Lahan Kering Bercampur Semak" },
      { color: "#9ca3af", label: "Sawah · Tanah Terbuka (arsir)" },
      { color: "#4e4e4e", label: "Permukiman" },
      { color: "#73adad", label: "Rawa" },
      { color: "#d4fcf7", label: "Tubuh Air" },
    ],
  },
  {
    key: "pippib",
    group: "kemenhut",
    kind: "arcgis",
    tier: "area",
    label: "PIPPIB 2026 Periode I",
    description: "Moratorium izin baru di hutan alam primer & gambut (Inpres 5/2019)",
    color: "#00a884",
    service: `${KEMENHUT}/PIPPIB_AR_250K/MapServer`,
    source: `${KEMENHUT_SOURCE}, Peta Indikatif Penghentian Pemberian Izin Baru 2026 Periode I 1:250.000`,
    legend: [
      { color: "#00a884", label: "Hutan alam primer & kawasan hutan" },
      { color: "#ff7f7f", label: "Lahan gambut" },
    ],
  },
  {
    key: "deforestasiKlhk2425",
    group: "kemenhut",
    kind: "arcgis",
    tier: "change",
    label: "Deforestasi 2024–2025",
    description: "Deforestasi resmi: hutan 2024 yang bukan hutan lagi di 2025",
    // Warna isi renderer upstream (cyan pucat bertepi abu) — sengaja disamakan
    // agar yang dicari di peta cocok dengan swatch; lebih samar dari 2023–2024.
    color: "#b3f2fc",
    service: `${KEMENHUT}/DEFORESTASI_2024_2025_AR_50K/MapServer`,
    source: `${KEMENHUT_SOURCE}, Deforestasi 2024–2025 1:50.000`,
    legend: [{ color: "#b3f2fc", label: "Deforestasi 2024–2025 (cyan pucat, tepi abu)" }],
  },
  {
    key: "deforestasiKlhk2324",
    group: "kemenhut",
    kind: "arcgis",
    tier: "change",
    label: "Deforestasi 2023–2024",
    description: "Deforestasi resmi: hutan 2023 yang bukan hutan lagi di 2024",
    color: "#ff0000",
    service: `${KEMENHUT}/DEFORESTASI_2023_2024_AR_250K/MapServer`,
    source: `${KEMENHUT_SOURCE}, Deforestasi 2023–2024 1:250.000`,
    legend: [{ color: "#ff0000", label: "Deforestasi 2023–2024" }],
  },
  {
    key: "jrcForest2020",
    group: "gfw",
    kind: "xyz",
    tier: "area",
    label: "Tutupan Hutan 2020 (JRC)",
    description: "Peta acuan cut-off EUDR (31 Des 2020), resolusi 10 m",
    color: "#7266f9",
    tiles: `${GFW}/jrc_global_forest_cover/latest/dynamic/{z}/{x}/{y}.png?implementation=default`,
    source:
      "EC Joint Research Centre, Global Forest Cover 2020, lewat Global Forest Watch — CC BY 4.0",
    legend: [{ color: "#7266f9", label: "Hutan pada 2020" }],
    note: "Peta acuan EU Observatory, tidak mengikat secara hukum.",
  },
  {
    key: "treeCoverLoss",
    group: "gfw",
    kind: "xyz",
    tier: "change",
    label: "Kehilangan Tutupan Pohon ≥ 2021",
    description: "Kehilangan tutupan pohon tahunan sejak 2021 (s.d. data tahunan terbaru GFW)",
    color: "#e45796",
    tiles: `${GFW}/umd_tree_cover_loss/latest/dynamic/{z}/{x}/{y}.png?start_year=2021&render_type=true_color`,
    source:
      "Hansen/UMD/Google/USGS/NASA, Tree Cover Loss, lewat Global Forest Watch — CC BY 4.0",
    legend: [{ color: "#e45796", label: "Hilang 2021 – tahun data terbaru" }],
    note: "Kehilangan tutupan pohon termasuk panen kebun/HTI — tidak sama dengan deforestasi.",
  },
  {
    key: "deforestationAlerts",
    group: "gfw",
    kind: "xyz",
    tier: "change",
    label: "Peringatan Deforestasi Terpadu",
    description: "GLAD-L + GLAD-S2 + RADD sejak 2021, diperbarui mingguan",
    color: "#c92a6d",
    tiles: `${GFW}/gfw_integrated_alerts/latest/dynamic/{z}/{x}/{y}.png?render_type=true_color&start_date=2021-01-01`,
    source:
      "UMD/GLAD & Wageningen University, Integrated Deforestation Alerts, lewat Global Forest Watch — CC BY 4.0",
    legend: [
      { color: "#dc6699", label: "Peringatan" },
      { color: "#c92a6d", label: "Keyakinan tinggi" },
    ],
    note: "Peringatan perubahan tutupan, bukan konfirmasi deforestasi.",
  },
];

/** Overlays in draw order, top first: `change` layers above every `area` layer. */
export const MAP_OVERLAYS_DRAW_ORDER: OverlayDef[] = [
  ...MAP_OVERLAYS.filter((o) => o.tier === "change"),
  ...MAP_OVERLAYS.filter((o) => o.tier === "area"),
];

/** MapLibre layer id of an overlay (`overlay-<key>-layer`). */
export const overlayLayerId = (key: string) => `overlay-${key}-layer`;

/** Id of the bottom-most overlay layer — anchor for layers that must sit beneath all overlays. */
export const OVERLAY_BOTTOM_LAYER_ID = overlayLayerId(
  MAP_OVERLAYS_DRAW_ORDER[MAP_OVERLAYS_DRAW_ORDER.length - 1].key,
);

/** Whitelisted arcgis overlay for the `/api/map-overlay/[key]` proxy; `undefined` for unknown or xyz keys. */
export function findProxiedOverlay(key: string): ArcgisOverlayDef | undefined {
  return MAP_OVERLAYS.find((o): o is ArcgisOverlayDef => o.kind === "arcgis" && o.key === key);
}

/**
 * Raster tile URL template for MapLibre. arcgis overlays point at our
 * same-origin proxy (`/api/map-overlay/[key]`); `{bbox-epsg-3857}` is
 * substituted by MapLibre with each tile's Web Mercator extent and forwarded to
 * the upstream ArcGIS `export` endpoint. xyz overlays are loaded directly.
 */
export function overlayTileUrl(def: OverlayDef): string {
  return def.kind === "xyz" ? def.tiles : `/api/map-overlay/${def.key}?bbox={bbox-epsg-3857}`;
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
