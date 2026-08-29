import { describe, it, expect } from "vitest";
import {
  MAP_STYLES,
  MAP_STYLE_KEYS,
  MAP_STYLE_LABELS,
  IMAGERY_STYLE_KEYS,
  isImageryStyle,
  GLYPHS,
  OPENFREEMAP_LIGHT_URL,
  OPENFREEMAP_DARK_URL,
  OPENFREEMAP_FONT,
  OPENMAPTILES_FONT,
} from "@/lib/map-style";
import { fontForGlyphs, findBasemapLabelLayer } from "@/hooks/use-vector-basemap";

// TD-036/#307: basemap satu sumber. Sejak 2026-08-29 satu set 5 kunci untuk
// SEMUA canvas (dulu MAP_STYLES 3 + PARCEL_MAP_STYLES 4 yang beda urutan);
// Light/Dark jadi style vector, sisanya tetap raster.

describe("map-style — basemap bersama (TD-036)", () => {
  it("lima kunci, urutan tetap (= urutan tombol)", () => {
    expect(MAP_STYLE_KEYS).toEqual(["streetmap", "light", "dark", "satellite", "hybrid"]);
    expect(Object.keys(MAP_STYLES)).toEqual(MAP_STYLE_KEYS);
  });

  it("Light & Dark = URL style vector OpenFreeMap; sisanya StyleSpecification raster", () => {
    expect(MAP_STYLES.light).toBe(OPENFREEMAP_LIGHT_URL);
    expect(MAP_STYLES.dark).toBe(OPENFREEMAP_DARK_URL);
    for (const key of ["streetmap", "satellite", "hybrid"] as const) {
      expect(typeof MAP_STYLES[key], key).toBe("object");
    }
  });

  it("style raster memuat glyphs (symbol layer butuh font PBF)", () => {
    for (const key of ["streetmap", "satellite", "hybrid"] as const) {
      const style = MAP_STYLES[key];
      if (typeof style === "string") throw new Error("unreachable");
      expect(style.glyphs, key).toBe(GLYPHS);
    }
  });

  it("StreetMap = OSM standar, bukan lagi bernama light", () => {
    const style = MAP_STYLES.streetmap;
    if (typeof style === "string") throw new Error("unreachable");
    expect(Object.keys(style.sources)).toEqual(["osm-streetmap"]);
    const src = style.sources["osm-streetmap"];
    if (src.type !== "raster") throw new Error("unreachable");
    expect(src.tiles?.[0]).toContain("tile.openstreetmap.org");
  });

  it("tak ada lagi sumber Esri/CARTO (penyedianya OSM/OpenFreeMap/Google)", () => {
    const ids = Object.values(MAP_STYLES)
      .filter((s) => typeof s !== "string")
      .flatMap((s) => Object.keys(s.sources));
    expect(ids.filter((id) => id.startsWith("carto-") || id.startsWith("esri-"))).toEqual([]);
  });

  it("setiap kunci punya label pendek + tooltip penuh", () => {
    for (const key of MAP_STYLE_KEYS) {
      expect(MAP_STYLE_LABELS[key].short.length, key).toBeLessThanOrEqual(6);
      expect(MAP_STYLE_LABELS[key].full.length, key).toBeGreaterThan(0);
    }
  });

  it("citra Google = satellite & hybrid (canvas ter-taint, cetak PDF gagal)", () => {
    expect(IMAGERY_STYLE_KEYS).toEqual(["satellite", "hybrid"]);
    expect(isImageryStyle("hybrid")).toBe(true);
    expect(isImageryStyle("streetmap")).toBe(false);
  });
});

describe("use-vector-basemap — pilih font dari style yang termuat", () => {
  it("glyphs OpenFreeMap → Noto; selain itu → Open Sans", () => {
    expect(fontForGlyphs("https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf")).toBe(
      OPENFREEMAP_FONT
    );
    expect(fontForGlyphs(GLYPHS)).toBe(OPENMAPTILES_FONT);
    // Style belum termuat: jangan menebak Noto — raster adalah default aman.
    expect(fontForGlyphs(undefined)).toBe(OPENMAPTILES_FONT);
  });
});

describe("use-vector-basemap — sisipkan data di bawah label basemap", () => {
  const layers = [
    { id: "background", type: "background" },
    { id: "water", type: "fill" },
    { id: "place_other", type: "symbol", layout: { "text-field": ["get", "name"] } },
    { id: "place_city", type: "symbol", layout: { "text-field": ["get", "name"] } },
  ];

  it("mengembalikan layer teks basemap PERTAMA", () => {
    expect(findBasemapLabelLayer(layers)).toBe("place_other");
  });

  it("mengabaikan layer teks milik aplikasi (agar tak salah tunjuk)", () => {
    const withApp = [
      { id: "fire-boundary-label", type: "symbol", layout: { "text-field": ["get", "name"] } },
      ...layers,
    ];
    expect(findBasemapLabelLayer(withApp)).toBe("place_other");
  });

  it("style raster tanpa layer simbol → undefined (perilaku lama: menumpuk di atas)", () => {
    expect(findBasemapLabelLayer([{ id: "osm-streetmap-layer", type: "raster" }])).toBeUndefined();
  });
});
