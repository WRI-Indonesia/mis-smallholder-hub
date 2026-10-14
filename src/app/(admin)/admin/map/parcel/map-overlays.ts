/**
 * User-added GIS layers for Peta Lahan's "Tambah Data GIS Lain" panel.
 * The built-in reference overlays ("Peta Lainnya") live in `@/lib/map-overlays`
 * (shared with Peta Supply Chain, #433).
 */

import type { FeatureCollection, Feature, Geometry } from "geojson";

// ---------------------------------------------------------------------------
// User-added GIS layers ("Tambah Data GIS Lain") — session-only, not persisted.
// ---------------------------------------------------------------------------

/** Pewarnaan kategorikal (unique value) sebuah layer vector berdasarkan satu atribut. */
export type CustomLayerSymbology = {
  attribute: string;
  /** Nilai atribut (sebagai string) → warna; nilai di luar mapping memakai warna dasar layer. */
  mapping: Record<string, string>;
  /** Total nilai unik atribut — bisa lebih besar dari isi mapping bila terpotong batas kelas. */
  totalValues: number;
};

/** A layer added by the user at runtime: a WMS/tile URL or a parsed vector set. */
export type CustomLayer = {
  id: string;
  name: string;
  /** Swatch / vector styling color. */
  color: string;
  visible: boolean;
} & (
    | { kind: "wms"; tileUrl: string }
    | { kind: "vector"; data: FeatureCollection; symbology?: CustomLayerSymbology }
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

/** Batas jumlah kelas warna symbology agar legend masih terbaca; nilai selebihnya memakai warna dasar. */
const SYMBOLOGY_MAX_CLASSES = 24;

/**
 * Palet kategorikal symbology — 8 hue urutan tetap (tervalidasi pemisahan CVD
 * untuk pasangan bersebelahan); disiklus bila kelas lebih dari 8, dengan legend
 * dan popup atribut sebagai pembawa identitas.
 */
const SYMBOLOGY_PALETTE = [
  "#2a78d6",
  "#eb6834",
  "#1baf7a",
  "#eda100",
  "#e87ba4",
  "#008300",
  "#4a3aa7",
  "#e34948",
];

/** Semua atribut yang tersedia untuk symbology: punya minimal satu nilai non-kosong. */
export function symbologyCandidates(fc: FeatureCollection): string[] {
  const keys = new Set<string>();
  for (const f of fc.features) {
    for (const [key, value] of Object.entries(f.properties ?? {})) {
      if (value === null || value === undefined || value === "") continue;
      keys.add(key);
    }
  }
  return [...keys].sort((a, b) => a.localeCompare(b, "id"));
}

/**
 * Susun symbology untuk satu atribut: nilai unik diurutkan alfabet-numerik,
 * SYMBOLOGY_MAX_CLASSES pertama diberi warna (palet disiklus), sisanya jatuh ke
 * warna dasar layer.
 */
export function buildSymbology(
  fc: FeatureCollection,
  attribute: string
): CustomLayerSymbology {
  const values = new Set<string>();
  for (const f of fc.features) {
    const value = f.properties?.[attribute];
    if (value === null || value === undefined || value === "") continue;
    values.add(String(value));
  }
  const collator = new Intl.Collator("id", { numeric: true });
  const sorted = [...values].sort(collator.compare).slice(0, SYMBOLOGY_MAX_CLASSES);
  return {
    attribute,
    mapping: Object.fromEntries(
      sorted.map((value, i) => [value, SYMBOLOGY_PALETTE[i % SYMBOLOGY_PALETTE.length]])
    ),
    totalValues: values.size,
  };
}

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
