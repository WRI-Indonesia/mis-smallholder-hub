// Gaya layer peta bersama (dedup #241) + basemap bersama (dedup TD-036, #307).

import type { CircleLayerSpecification, StyleSpecification } from "maplibre-gl";

/**
 * Paint titik pohon sawit (kuning, tepi cokelat) — dipakai peta Informasi
 * Lahan (Detail Lahan) dan peta Sebaran Lahan (Detail Petani/Lembaga).
 * Warna yang sama juga dipakai dot legenda di kedua halaman (kelas Tailwind
 * literal `bg-[#facc15] border-[#854d0e]` — tak bisa dari konstanta).
 */
export const TREE_POINT_PAINT: NonNullable<CircleLayerSpecification["paint"]> = {
  "circle-radius": 3.5,
  "circle-color": "#facc15",
  "circle-opacity": 0.9,
  "circle-stroke-width": 1,
  "circle-stroke-color": "#854d0e",
};

// ---------------------------------------------------------------------------
// Basemap (TD-036): definisi tunggal untuk semua canvas peta. Sebelumnya blok
// ini tersalin di 6 berkas, sehingga pergantian penyedia tile (#298) harus
// disunting enam kali.
// ---------------------------------------------------------------------------

export const GLYPHS = "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf";

const ESRI_ATTRIBUTION = 'Tiles &copy; <a href="https://www.esri.com/">Esri</a> &mdash; Esri, DeLorme, NAVTEQ';
const GOOGLE_ATTRIBUTION = "Map data &copy; Google";

const LIGHT: StyleSpecification = {
  version: 8,
  glyphs: GLYPHS,
  sources: {
    "osm-light": {
      type: "raster",
      // OSM standar (tanpa API key) — pengganti CARTO yang sejak 2024 menandai tile zoom tinggi "API KEY REQUIRED" (#298).
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      maxzoom: 19,
      tileSize: 256,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  },
  layers: [{ id: "osm-light-layer", type: "raster", source: "osm-light", minzoom: 0, maxzoom: 20 }],
};

const DARK: StyleSpecification = {
  version: 8,
  glyphs: GLYPHS,
  sources: {
    "esri-dark": {
      type: "raster",
      // Esri World Dark Gray (tanpa API key); zoom >16 diperbesar dari tile 16 — tanpa tanda air (#298).
      tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"],
      maxzoom: 16,
      tileSize: 256,
      attribution: ESRI_ATTRIBUTION,
    },
    "esri-dark-ref": {
      type: "raster",
      // Esri memisahkan basis dari labelnya: tanpa layer Reference ini peta Dark
      // polos tanpa nama tempat/jalan/batas admin (#307). PNG transparan, jadi
      // hanya labelnya yang tergambar di atas basis.
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
      ],
      maxzoom: 16,
      tileSize: 256,
      // Atribusi cukup sekali di sumber basis — penyedianya sama.
    },
  },
  // Label di atas basis; layer data (poligon/titik) ditambahkan belakangan oleh
  // tiap canvas sehingga otomatis berada di atas keduanya.
  layers: [
    { id: "esri-dark-layer", type: "raster", source: "esri-dark", minzoom: 0, maxzoom: 20 },
    { id: "esri-dark-ref-layer", type: "raster", source: "esri-dark-ref", minzoom: 0, maxzoom: 20 },
  ],
};

const HYBRID: StyleSpecification = {
  version: 8,
  glyphs: GLYPHS,
  sources: {
    "google-hybrid": {
      type: "raster",
      tiles: ["https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"],
      tileSize: 256,
      attribution: GOOGLE_ATTRIBUTION,
    },
  },
  layers: [{ id: "google-hybrid-layer", type: "raster", source: "google-hybrid", minzoom: 0, maxzoom: 20 }],
};

const SATELLITE: StyleSpecification = {
  version: 8,
  glyphs: GLYPHS,
  sources: {
    "google-satellite": {
      type: "raster",
      tiles: ["https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"],
      tileSize: 256,
      attribution: GOOGLE_ATTRIBUTION,
    },
  },
  layers: [{ id: "google-satellite-layer", type: "raster", source: "google-satellite", minzoom: 0, maxzoom: 20 }],
};

/**
 * Basemap canvas peta utama (Peta Lahan, Peta BMP, Dashboard, Fire Alert):
 * Light/Dark mengikuti tema aplikasi, Hybrid dipilih manual. Urutan kunci =
 * urutan tombol pemilih basemap.
 */
export const MAP_STYLES: Record<"light" | "dark" | "hybrid", StyleSpecification> = {
  light: LIGHT,
  dark: DARK,
  hybrid: HYBRID,
};

/**
 * Basemap peta lahan (Detail Lahan, Sebaran Lahan, pratinjau bulk upload):
 * default Hybrid, plus Satellite (citra tanpa label) untuk membaca tutupan lahan.
 */
export const PARCEL_MAP_STYLES: Record<"hybrid" | "satellite" | "light" | "dark", StyleSpecification> = {
  hybrid: HYBRID,
  satellite: SATELLITE,
  light: LIGHT,
  dark: DARK,
};
