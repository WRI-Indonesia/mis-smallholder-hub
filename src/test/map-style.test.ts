import { describe, it, expect } from "vitest";
import { MAP_STYLES, PARCEL_MAP_STYLES, GLYPHS } from "@/lib/map-style";

// TD-036/#307: basemap kini satu sumber. Test menjaga kunci (urutan = urutan
// tombol pemilih basemap) dan susunan layer Dark (label di atas basis).

const ALL_STYLES = { ...MAP_STYLES, ...PARCEL_MAP_STYLES };

describe("map-style — basemap bersama (TD-036)", () => {
  it("MAP_STYLES: kunci light/dark/hybrid, urutan tetap", () => {
    expect(Object.keys(MAP_STYLES)).toEqual(["light", "dark", "hybrid"]);
  });

  it("PARCEL_MAP_STYLES: hybrid dulu (default peta lahan), plus satellite", () => {
    expect(Object.keys(PARCEL_MAP_STYLES)).toEqual(["hybrid", "satellite", "light", "dark"]);
  });

  it("light/dark identik antar kedua kumpulan (objek yang sama)", () => {
    expect(PARCEL_MAP_STYLES.light).toBe(MAP_STYLES.light);
    expect(PARCEL_MAP_STYLES.dark).toBe(MAP_STYLES.dark);
    expect(PARCEL_MAP_STYLES.hybrid).toBe(MAP_STYLES.hybrid);
  });

  it("semua style memuat glyphs (symbol layer butuh font PBF)", () => {
    for (const [key, style] of Object.entries(ALL_STYLES)) {
      expect(style.glyphs, key).toBe(GLYPHS);
    }
  });

  it("dark: layer Reference (label) ada dan berada DI ATAS basis", () => {
    const dark = MAP_STYLES.dark;
    expect(Object.keys(dark.sources)).toEqual(["esri-dark", "esri-dark-ref"]);
    expect(dark.layers.map((l) => l.id)).toEqual(["esri-dark-layer", "esri-dark-ref-layer"]);

    const ref = dark.sources["esri-dark-ref"];
    expect(ref.type).toBe("raster");
    if (ref.type !== "raster") throw new Error("unreachable");
    expect(ref.tiles?.[0]).toContain("World_Dark_Gray_Reference");
    // Diperbesar dari tile 16 seperti basisnya — kalau beda, label bergeser dari basis.
    expect(ref.maxzoom).toBe(16);
    expect(ref.tileSize).toBe(256);
  });

  it("dark: atribusi Esri hanya sekali (basis & label satu penyedia)", () => {
    const attributions = Object.values(MAP_STYLES.dark.sources)
      .map((s) => ("attribution" in s ? s.attribution : undefined))
      .filter(Boolean);
    expect(attributions).toHaveLength(1);
    expect(attributions[0]).toContain("Esri");
  });

  it("tak ada lagi id sumber bernama carto-* (penyedianya OSM/Esri sejak #298)", () => {
    const ids = Object.values(ALL_STYLES).flatMap((s) => Object.keys(s.sources));
    expect(ids.filter((id) => id.startsWith("carto-"))).toEqual([]);
  });
});
