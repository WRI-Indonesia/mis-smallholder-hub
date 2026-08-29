"use client";

import { useCallback, useState } from "react";
import {
  MAP_STYLES,
  OPENFREEMAP_FONT,
  OPENFREEMAP_GLYPH_HOST,
  OPENMAPTILES_FONT,
  type MapStyleKey,
  type MapStyleValue,
} from "@/lib/map-style";

/**
 * Perekat basemap vector untuk semua canvas peta (#307 lanjutan).
 *
 * Sejak Light/Dark memakai style vector OpenFreeMap, tiap canvas harus
 * menangani tiga hal yang tidak ada pada basemap raster. Ketiganya diselesaikan
 * di sini supaya tidak tersalin tujuh kali — persis kesalahan yang melahirkan
 * TD-036.
 *
 * 1. **Font label ikut style.** Kedua server glyph tak punya satu pun font yang
 *    sama: OpenFreeMap hanya "Noto Sans Regular", OpenMapTiles hanya "Open Sans
 *    Regular". Font WAJIB diturunkan dari style yang benar-benar termuat, bukan
 *    dari `styleKey`: `setStyle` itu asinkron, jadi ada jendela ketika style
 *    LAMA masih hidup sementara props layer sudah memakai font style BARU.
 *    Kalau font diminta ke server yang tak punya, `fonts.openmaptiles.org`
 *    menjawab **HTTP 200 berisi halaman HTML** (bukan 404) — MapLibre
 *    menyuapkannya ke parser pbf, gagal "Unimplemented type: 4", dan seluruh
 *    teks jatuh ke render lokal. `labelsReady` menutup jendela itu: layer label
 *    baru dipasang setelah style aktif melayani font yang diminta.
 *
 * 2. **Urutan layer.** Basemap vector punya layer teksnya sendiri. Poligon dan
 *    garis kita harus disisipkan SEBELUM layer teks pertama milik basemap
 *    (`labelBeforeId`), kalau tidak fill menutupi label. `undefined` pada style
 *    raster = perilaku lama (menumpuk di atas).
 *
 * 3. **Ikon hilang di sprite hulu.** Style `dark` OpenFreeMap merujuk
 *    `circle-11` dan `wood-pattern` yang tidak ada di sprite-nya sendiri.
 *    Placeholder 1×1 transparan meredam peringatan tanpa mengubah tampilan.
 *    `provideImage` memberi canvas kesempatan menyediakan ikonnya sendiri lebih
 *    dulu (Fire Alert memakainya untuk ikon api) — satu listener saja, jadi
 *    tidak ada adu urutan antar-listener.
 */

/** 1×1 RGBA transparan — pengganti ikon basemap yang hilang di sprite hulu. */
const BLANK_IMAGE = { width: 1, height: 1, data: new Uint8Array(4) };

/**
 * Prefiks id layer milik aplikasi, supaya tak dikira layer teks basemap.
 * Ini **jaring kedua**, bukan pertahanan utama: daftar seperti ini pasti
 * tertinggal saat layer baru lahir (`kt-`, `measure-`, dan `unclustered-`
 * sempat luput). Pertahanan utamanya ada di `syncStyle` — `labelBeforeId` hanya
 * dihitung ketika style yang BENAR-BENAR termuat adalah basemap vector.
 */
const APP_LAYER_PREFIXES = [
  "fire-", "bmp-", "parcel", "group-", "dashboard-", "cluster", "tree-",
  "kt-", "measure-", "unclustered-", "hotspot", "overlay-", "user-",
];

type StyleLayerLike = { id: string; type: string; layout?: Record<string, unknown> };

/** Layer teks pertama milik basemap (bukan milik aplikasi). */
export function findBasemapLabelLayer(layers: StyleLayerLike[]): string | undefined {
  return layers.find(
    (l) =>
      l.type === "symbol" &&
      l.layout?.["text-field"] &&
      !APP_LAYER_PREFIXES.some((p) => l.id.startsWith(p))
  )?.id;
}

/** Font yang dilayani glyphs style aktif. */
export function fontForGlyphs(glyphs: string | undefined): string {
  return glyphs?.includes(OPENFREEMAP_GLYPH_HOST) ? OPENFREEMAP_FONT : OPENMAPTILES_FONT;
}

type MapLike = {
  getStyle: () => { layers?: unknown[]; glyphs?: string } | undefined;
  hasImage: (id: string) => boolean;
  addImage: (id: string, img: ImageData | typeof BLANK_IMAGE, opts?: { pixelRatio: number }) => void;
  on: (event: "styleimagemissing", cb: (e: { id: string }) => void) => void;
};

type Options = {
  /**
   * Ikon milik canvas sendiri. Dipanggil lebih dulu saat MapLibre meminta image
   * yang belum ada; kembalikan `null` bila id itu bukan milik canvas.
   */
  provideImage?: (id: string) => ImageData | null;
};

export function useVectorBasemap(styleKey: MapStyleKey, options: Options = {}) {
  const { provideImage } = options;

  const mapStyle: MapStyleValue = MAP_STYLES[styleKey];
  const isVectorStyle = typeof mapStyle === "string";
  const expectedFont = isVectorStyle ? OPENFREEMAP_FONT : OPENMAPTILES_FONT;

  const [labelBeforeId, setLabelBeforeId] = useState<string | undefined>(undefined);
  const [liveFont, setLiveFont] = useState<string | null>(null);

  /** Panggil di `onLoad` DAN `onStyleData` — keduanya idempoten. */
  const syncStyle = useCallback((map: MapLike) => {
    const style = map.getStyle();
    const font = fontForGlyphs(style?.glyphs);
    // HANYA basemap vector yang punya layer teks sendiri. Pada basemap raster
    // (streetmap/satellite/hybrid) satu-satunya layer simbol di style adalah
    // milik aplikasi, sehingga "cari layer teks pertama" justru mengembalikan
    // layer kita sendiri — fill/line lalu disisipkan DI BAWAHNYA dan, misalnya,
    // overlay ukur tergambar di bawah titik api. `undefined` = perilaku lama.
    setLabelBeforeId(
      font === OPENFREEMAP_FONT
        ? findBasemapLabelLayer((style?.layers ?? []) as StyleLayerLike[])
        : undefined,
    );
    setLiveFont(font);
  }, []);

  /**
   * Panggil sekali di `onLoad`. Listener hidup di objek Map sehingga bertahan
   * melintasi `setStyle`; `styleimagemissing` terpancar lagi tiap style baru.
   */
  const registerImageFallback = useCallback(
    (map: MapLike) => {
      map.on("styleimagemissing", ({ id }) => {
        if (map.hasImage(id)) return;
        const own = provideImage?.(id) ?? null;
        if (own) {
          map.addImage(id, own, { pixelRatio: 2 });
          return;
        }
        map.addImage(id, BLANK_IMAGE);
      });
    },
    [provideImage]
  );

  return {
    /** Diteruskan ke prop `mapStyle` react-map-gl. */
    mapStyle,
    isVectorStyle,
    /** Font untuk `text-font` layer label canvas. */
    labelFont: expectedFont,
    /** Pasang layer label hanya bila `true` (lihat butir 1 di atas). */
    labelsReady: liveFont === expectedFont,
    /** `beforeId` untuk layer fill/line canvas (lihat butir 2). */
    labelBeforeId,
    syncStyle,
    registerImageFallback,
  };
}
