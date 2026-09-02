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

const GOOGLE_ATTRIBUTION = "Map data &copy; Google";

/**
 * OSM standar — dulu bernama `light`, kini pilihan tersendiri **StreetMap**
 * karena terlalu ramai untuk jadi latar data (owner 2026-08-29). Tanpa API key;
 * pengganti CARTO yang sejak 2024 menandai tile zoom tinggi "API KEY REQUIRED" (#298).
 *
 * Esri World Dark Gray (Base + Reference, #298/#307) sudah DICABUT dari sini —
 * digantikan style vector OpenFreeMap yang labelnya jauh lebih padat.
 */
const STREETMAP: StyleSpecification = {
  version: 8,
  glyphs: GLYPHS,
  sources: {
    "osm-streetmap": {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      maxzoom: 19,
      tileSize: 256,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  },
  layers: [{ id: "osm-streetmap-layer", type: "raster", source: "osm-streetmap", minzoom: 0, maxzoom: 20 }],
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

/**
 * Citra murni tanpa label — untuk membaca tutupan lahan. Diekspor sementara
 * karena uji coba Fire Alert (#307) menyusun pilihannya sendiri; saat uji coba
 * dipromosikan ke `MAP_STYLES`, ekspor ini bisa dicabut lagi.
 */
export const SATELLITE: StyleSpecification = {
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

// ---------------------------------------------------------------------------
// Light & Dark vector (#307 lanjutan, 2026-08-29)
//
// Esri Dark Gray itu *canvas basemap* — sengaja menepi, jadi labelnya sangat
// sedikit di pedesaan Riau (tile Reference z14 di Riau hanya 872 b, praktis
// kosong); itu sebab #307. OSM standar sebaliknya: terlalu ramai untuk jadi
// latar data. OpenFreeMap menyajikan vector tile OSM tanpa API key/registrasi/
// kuota, label secukupnya dan tajam di semua zoom (tidak diperbesar dari tile
// 16 seperti raster). OSM tetap tersedia sebagai pilihan sendiri: StreetMap.
//
// Ditolak sepanjang jalan:
//   • Esri World Light Gray — Reference z14 Riau 872 b, sekosong Dark Gray.
//   • VersaTiles `eclipse`  — sprite lengkap (112/112) tapi 324 layer, terlalu
//     ramai di belakang poligon lahan (penilaian owner).
//   • Stadia / CARTO / MapTiler — butuh API key + registrasi domain (#307).
//
// Harga yang diterima dari OpenFreeMap: style `dark`-nya merujuk `circle-11`
// dan `wood-pattern` yang TIDAK ada di sprite-nya sendiri (264 ikon) — cacat
// hulu yang tak bisa kita perbaiki. `useVectorBasemap` memberi placeholder
// transparan agar console tidak berisik; tampilan tak berubah karena ikon itu
// memang tak pernah tergambar.
// ---------------------------------------------------------------------------

/**
 * URL style (bukan StyleSpecification) — MapLibre mengunduh style + glyphs +
 * sprite-nya sendiri. Sepasang: penyedia, skema, glyphs, dan sprite sama.
 */
export const OPENFREEMAP_LIGHT_URL = "https://tiles.openfreemap.org/styles/positron";
export const OPENFREEMAP_DARK_URL = "https://tiles.openfreemap.org/styles/dark";

/** Penanda host glyphs style di atas — dipakai mendeteksi style vector yang sedang aktif. */
export const OPENFREEMAP_GLYPH_HOST = "openfreemap.org";

/**
 * Glyphs OpenFreeMap TIDAK memuat "Open Sans Regular" (404) — hanya
 * "Noto Sans Regular"/"Bold". Layer label milik kita harus ikut berganti font
 * saat style ini aktif, kalau tidak teksnya hilang diam-diam. Fontstack
 * gabungan juga tidak dilayani, jadi harus satu nama saja.
 */
export const OPENFREEMAP_FONT = "Noto Sans Regular";

/** Font glyphs OpenMapTiles (dipakai style raster StreetMap/Satellite/Hybrid). */
export const OPENMAPTILES_FONT = "Open Sans Regular";

/** Nilai basemap: `string` = URL style vector, objek = StyleSpecification raster. */
export type MapStyleValue = StyleSpecification | string;

/**
 * Basemap seluruh canvas peta — SATU set untuk semua halaman, urutan kunci =
 * urutan tombol. Yang berbeda antar halaman hanya **default**-nya, bukan
 * daftar atau urutannya (keputusan owner 2026-08-29):
 *
 *   • Main Dashboard        → `streetmap` untuk kedua tema; peta ikhtisar butuh
 *     nama kota/jalan sebagai orientasi, bukan latar yang menepi
 *   • Fire Alert, Peta Lahan, Peta BMP → ikut tema aplikasi (`light`/`dark`)
 *   • Detail Lahan, Sebaran Lahan, pratinjau bulk upload → `hybrid`
 *
 * Menggantikan `PARCEL_MAP_STYLES` yang dulu terpisah: isinya hanya beda
 * urutan dan kekurangan StreetMap, sehingga tombol tidak konsisten antar
 * halaman.
 */
export const MAP_STYLES = {
  streetmap: STREETMAP,
  light: OPENFREEMAP_LIGHT_URL,
  dark: OPENFREEMAP_DARK_URL,
  satellite: SATELLITE,
  hybrid: HYBRID,
} as const satisfies Record<string, MapStyleValue>;

export type MapStyleKey = keyof typeof MAP_STYLES;

/** Urutan tombol pemilih basemap. */
export const MAP_STYLE_KEYS = Object.keys(MAP_STYLES) as MapStyleKey[];

/**
 * Label tombol dipendekkan — lima label penuh menabrak legenda di layar sempit;
 * `full` dipakai sebagai tooltip.
 */
export const MAP_STYLE_LABELS: Record<MapStyleKey, { short: string; full: string }> = {
  streetmap: { short: "STREET", full: "StreetMap — OpenStreetMap, paling detail" },
  light: { short: "LIGHT", full: "Light — terang, label secukupnya" },
  dark: { short: "DARK", full: "Dark — gelap, label secukupnya" },
  satellite: { short: "SAT", full: "Satellite — citra tanpa label" },
  hybrid: { short: "HYBRID", full: "Hybrid — citra + label" },
};

/** Citra Google: men-taint canvas, sehingga capture cetak PDF gagal di sini. */
export const IMAGERY_STYLE_KEYS: MapStyleKey[] = ["satellite", "hybrid"];

/** `true` bila kunci ini basemap citra — label perlu teks putih ber-halo hitam. */
export const isImageryStyle = (key: MapStyleKey) => IMAGERY_STYLE_KEYS.includes(key);

/**
 * Template tile XYZ sebuah basemap **raster** (mis.
 * `https://tile.openstreetmap.org/{z}/{x}/{y}.png`), atau `null` bila kuncinya
 * style vector (`light`/`dark`) yang tidak punya tile gambar.
 *
 * Dibaca dari `MAP_STYLES` — bukan disalin — supaya pergantian penyedia tile
 * (#298) tetap satu suntingan, persis alasan TD-036. Dipakai proxy tile
 * `/api/map-basemap` untuk latar peta cetak Laporan Lahan.
 */
export function rasterTileTemplate(key: MapStyleKey): string | null {
  const style = MAP_STYLES[key];
  if (typeof style === "string") return null;
  for (const source of Object.values(style.sources)) {
    if (source.type === "raster" && source.tiles?.[0]) return source.tiles[0];
  }
  return null;
}
