/**
 * Latar (basemap) raster untuk **peta cetak Laporan Lahan** (#318).
 *
 * Peta di halaman ini bukan MapLibre: `buildLandParcelMapLayout` memproyeksikan
 * lon/lat ke mm sendiri, lalu digambar tiga kali — SVG (preview), primitif
 * vektor jsPDF (PDF), dan SVG→PNG (Excel). Karena itu latar peta tidak bisa
 * sekadar mengganti `mapStyle`; ia harus jadi **satu gambar** yang menutupi
 * bbox layout, supaya ketiga jalur render memakai piksel yang sama persis.
 *
 * Tiga keputusan yang membentuk modul ini:
 *
 * 1. **Hanya basemap raster.** Dari lima basemap MIS (`MAP_STYLES`), `light` &
 *    `dark` adalah style *vector* OpenFreeMap — hanya MapLibre yang bisa
 *    menggambarnya, jadi tak ada gambar yang bisa diambil tanpa memasang peta
 *    tersembunyi. Sisanya (`streetmap`, `satellite`, `hybrid`) punya tile XYZ
 *    dan bisa dijahit di sini. Karena itu pilihannya empat, bukan enam.
 *
 * 2. **Tile lewat proxy same-origin.** `map-style.ts` sudah memperingatkan
 *    citra Google men-taint canvas; tile yang ditarik langsung membuat
 *    `toDataURL` melempar `SecurityError`, dan ekspor Excel (`svgToPng`) mati
 *    justru pada dua basemap yang paling diminta. `/api/map-basemap` memutus
 *    itu — sekaligus menambahkan cache & guard permission, pola yang sama
 *    dengan `/api/map-overlay`.
 *
 * 3. **Peredaman dipanggang ke dalam gambar,** bukan dipasang sebagai lapisan
 *    putih semi-transparan di tiap renderer. Satu data URL lalu berlaku apa
 *    adanya di SVG, jsPDF, dan PNG Excel — tak ada opasitas yang harus ditiru
 *    tiga kali (dan jsPDF tidak punya alpha pada `addImage`).
 *
 * Catatan proyeksi: tile bersistem Web Mercator, sedangkan layout memetakan
 * lintang secara **linear** (equirectangular, skala lon = skala lat). Di Riau
 * (0–2° LU) selisih kedua proyeksi ≈ 0,02% — di bawah 20 m pada peta selebar
 * 30 km, yaitu ±1 piksel cetak. Mosaik karena itu boleh diregangkan lurus ke
 * kotak layout tanpa reproyeksi per-baris.
 */

import type { MapStyleKey } from "@/lib/map-style";

/** Kunci latar peta cetak. `none` = perilaku lama (latar putih polos). */
export const REPORT_BASEMAP_KEYS = ["none", "streetmap", "satellite", "hybrid"] as const;
export type ReportBasemapKey = (typeof REPORT_BASEMAP_KEYS)[number];

/** Kunci yang benar-benar menarik tile (⊂ `MapStyleKey`). */
export type ReportBasemapTileKey = Exclude<ReportBasemapKey, "none">;

export const isTileBasemap = (key: ReportBasemapKey): key is ReportBasemapTileKey => key !== "none";

/** Label select — sengaja lengkap (bukan singkatan tombol peta layar). */
export const REPORT_BASEMAP_LABELS: Record<ReportBasemapKey, string> = {
  none: "Polos — tanpa latar",
  streetmap: "StreetMap — jalan & nama tempat",
  satellite: "Satellite — citra tanpa label",
  hybrid: "Hybrid — citra + label",
};

/**
 * Atribusi yang WAJIB ikut tercetak di peta. OSM mensyaratkannya pada tiap
 * karya turunan; tile Google mensyaratkan "Map data © Google". Cetakan beredar
 * di luar aplikasi, jadi atribusi tidak boleh hanya ada di layar.
 */
export const REPORT_BASEMAP_ATTRIBUTION: Record<ReportBasemapKey, string | null> = {
  none: null,
  streetmap: "© OpenStreetMap contributors",
  satellite: "Map data © Google",
  hybrid: "Map data © Google",
};

/**
 * Batas jumlah sel grid yang masih boleh ber-latar. Tiap sel = satu halaman =
 * satu JPEG (±300 KB) + ±35 permintaan tile; 4×6 sudah berarti ~900 tile dan
 * PDF belasan MB. Di atas batas ini latar dikunci ke `none` (keputusan owner
 * 2026-09-02) — grid rapat memang untuk peta detail per-blok, bukan citra.
 */
export const BASEMAP_MAX_CELLS = 30;

/** Peredaman bawaan (%): latar diputihkan 35% agar poligon & label tetap dominan. */
export const BASEMAP_DEFAULT_DIM = 65;

const TILE_PX = 256;

/** Zoom tile tertinggi yang dilayani ketiga penyedia. */
export const BASEMAP_MAX_ZOOM = 19;

/** Sisi terpanjang mosaik (px). ±1600 px pada lebar konten A4 lanskap ≈ 150 dpi. */
export const BASEMAP_TARGET_PX = 1600;

/** Kualitas JPEG mosaik — sama dengan capture peta Fire Alert/BMP. */
const JPEG_QUALITY = 0.85;

// ─── Matematika tile Web Mercator ───

export function lonToTileX(lon: number, zoom: number): number {
  return ((lon + 180) / 360) * 2 ** zoom;
}

export function latToTileY(lat: number, zoom: number): number {
  // Dijepit ke batas Mercator; di luar itu `tan` meledak ke tak hingga.
  const clamped = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const rad = (clamped * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** zoom;
}

/**
 * Zoom terkecil yang sudah memberi ≥ `targetPx` piksel untuk rentang bujur
 * `spanLon`. Dibulatkan ke ATAS: lebih baik mosaik terlalu tajam lalu diperkecil
 * saat digambar daripada tile diperbesar dan pecah di cetakan.
 */
export function pickBasemapZoom(spanLon: number, targetPx: number): number {
  if (!(spanLon > 0) || !(targetPx > 0)) return 0;
  const zoom = Math.log2((targetPx * 360) / (TILE_PX * spanLon));
  return Math.max(0, Math.min(BASEMAP_MAX_ZOOM, Math.ceil(zoom)));
}

/** Bbox layout (`LpMapLayout.frame`) yang harus ditutupi mosaik. */
export interface BasemapFrame {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
}

/**
 * Kunci cache satu mosaik. Bbox dibulatkan 6 desimal (±0,1 m) supaya perubahan
 * yang tak berarti — mis. render ulang saat ceklis label diubah — tidak
 * menarik ulang ratusan tile.
 */
export function basemapCacheKey(key: ReportBasemapKey, frame: BasemapFrame, dim: number): string {
  const r = (v: number) => v.toFixed(6);
  return `${key}|${dim}|${r(frame.minLon)},${r(frame.minLat)},${r(frame.maxLon)},${r(frame.maxLat)}`;
}

/** URL tile same-origin — proxy `/api/map-basemap` (lihat butir 2 di kepala berkas). */
export function basemapTileUrl(key: ReportBasemapTileKey, z: number, x: number, y: number): string {
  return `/api/map-basemap?key=${key}&z=${z}&x=${x}&y=${y}`;
}

/**
 * Perluas bbox data menjadi bbox **seluruh kotak peta**.
 *
 * `buildLandParcelMapLayout` menempatkan bbox lahan di tengah kotak dengan
 * rasio dipertahankan, jadi hampir selalu ada sisa ruang di kiri-kanan atau
 * atas-bawah. Mosaik yang hanya menutupi bbox lahan meninggalkan pita putih di
 * sisa itu — dan sisanya bisa lebar sekali untuk lembaga yang lahannya
 * memanjang. Dengan diperluas ke tepi kotak, latar mengisi penuh dan
 * penempatannya jadi sepele: gambar digambar persis pada kotak.
 *
 * Rasio mosaik lalu selalu mengikuti rasio kotak, sehingga ukurannya juga jadi
 * dapat diperkirakan (±1600 × 1070 px) alih-alih ikut bentuk sebaran lahan.
 */
export function expandFrameToBox(
  frame: BasemapFrame & { offX: number; offY: number; scale: number },
  box: { x: number; y: number; w: number; h: number },
): BasemapFrame {
  // Kebalikan `project()` di buildLandParcelMapLayout:
  //   x = offX + (lon - minLon) · scale ; y = offY + (maxLat - lat) · scale
  const s = frame.scale || 1e-6;
  return {
    minLon: frame.minLon - (frame.offX - box.x) / s,
    maxLon: frame.minLon + (box.x + box.w - frame.offX) / s,
    maxLat: frame.maxLat + (frame.offY - box.y) / s,
    minLat: frame.maxLat - (box.y + box.h - frame.offY) / s,
  };
}

/** Ukuran mosaik (px) untuk sebuah bbox: sisi terpanjang ≈ `targetPx`. */
export function basemapPixelSize(frame: BasemapFrame, targetPx: number): { w: number; h: number } {
  const spanLon = frame.maxLon - frame.minLon || 1e-6;
  const spanLat = frame.maxLat - frame.minLat || 1e-6;
  // Layout memakai skala mm/derajat yang SAMA untuk lon & lat, jadi rasio
  // piksel mosaik harus mengikuti rasio derajat — bukan rasio meter.
  const ratio = spanLat / spanLon;
  return ratio > 1
    ? { w: Math.max(1, Math.round(targetPx / ratio)), h: targetPx }
    : { w: targetPx, h: Math.max(1, Math.round(targetPx * ratio)) };
}

function loadTile(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    // Tile datang dari origin sendiri; `anonymous` tetap dipasang agar canvas
    // pasti tak ter-taint bila suatu saat proxy pindah ke CDN lain.
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    // Satu tile gagal bukan alasan menggagalkan seluruh peta — sisanya tetap
    // tergambar, lubangnya putih.
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * Jahit tile menjadi satu JPEG yang menutupi persis `frame`, sudah teredam.
 * Client-only (memakai `Image`/`canvas`). Mengembalikan `null` bila latar mati,
 * bbox tak masuk akal, atau canvas tak tersedia.
 */
export async function composeReportBasemap(
  key: ReportBasemapKey,
  frame: BasemapFrame,
  dim: number,
  targetPx: number = BASEMAP_TARGET_PX,
): Promise<string | null> {
  if (!isTileBasemap(key)) return null;

  const spanLon = frame.maxLon - frame.minLon;
  const spanLat = frame.maxLat - frame.minLat;
  if (!(spanLon > 0) || !(spanLat > 0)) return null;

  const { w, h } = basemapPixelSize(frame, targetPx);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingQuality = "high";

  const zoom = pickBasemapZoom(spanLon, w);
  const n = 2 ** zoom;
  const x0 = lonToTileX(frame.minLon, zoom);
  const x1 = lonToTileX(frame.maxLon, zoom);
  const y0 = latToTileY(frame.maxLat, zoom);
  const y1 = latToTileY(frame.minLat, zoom);
  // Skala mosaik→canvas: tile digambar pada resolusi aslinya lalu diperkecil
  // di sini, jadi tak perlu canvas antara seukuran mosaik penuh.
  const sx = w / ((x1 - x0) * TILE_PX);
  const sy = h / ((y1 - y0) * TILE_PX);

  const jobs: Promise<void>[] = [];
  for (let tx = Math.floor(x0); tx < x1; tx++) {
    for (let ty = Math.floor(y0); ty < y1; ty++) {
      if (ty < 0 || ty >= n) continue;
      // Bujur membungkus di antimeridian; lintang tidak (dilewati di atas).
      const wrappedX = ((tx % n) + n) % n;
      const dx = (tx - x0) * TILE_PX * sx;
      const dy = (ty - y0) * TILE_PX * sy;
      jobs.push(
        loadTile(basemapTileUrl(key, zoom, wrappedX, ty)).then((img) => {
          if (img) ctx.drawImage(img, dx, dy, TILE_PX * sx, TILE_PX * sy);
        }),
      );
    }
  }
  await Promise.all(jobs);

  // Peredaman: selubung putih. Alpha 0 = citra penuh, 1 = putih polos.
  const alpha = Math.min(1, Math.max(0, 1 - dim / 100));
  if (alpha > 0) {
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.fillRect(0, 0, w, h);
  }

  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

/**
 * Kunci `MAP_STYLES` untuk sebuah latar peta cetak — jembatan ke
 * `rasterTileTemplate`. Tipe-nya sengaja eksplisit agar penambahan kunci baru
 * yang tak ada di `MAP_STYLES` gagal saat kompilasi, bukan saat runtime.
 */
export const REPORT_BASEMAP_STYLE_KEY: Record<ReportBasemapTileKey, MapStyleKey> = {
  streetmap: "streetmap",
  satellite: "satellite",
  hybrid: "hybrid",
};
