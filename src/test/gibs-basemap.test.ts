import { describe, it, expect } from "vitest";
import type { FeatureCollection } from "geojson";
import { formatGibsDate, gibsImageryDate } from "@/lib/fire-alert";
import { GIBS_LAYER, GIBS_MAXZOOM, gibsStyle, gibsTileTemplate } from "@/lib/map-style";

/** Latar satelit harian NASA GIBS di Fire Alert (#290). */
const fc = (isos: (string | null)[]): FeatureCollection => ({
  type: "FeatureCollection",
  features: isos.map((iso) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [101.5, 0.5] },
    properties: { acqDatetime: iso },
  })),
});

describe("gibsTileTemplate / gibsStyle", () => {
  it("WMTS GoogleMapsCompatible_Level9, urutan {z}/{y}/{x} (bukan XYZ), satu tanggal", () => {
    const t = gibsTileTemplate("2026-10-08");
    expect(t).toBe(
      `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${GIBS_LAYER}/default/2026-10-08/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`
    );
    expect(t.indexOf("{y}")).toBeLessThan(t.indexOf("{x}"));
  });

  it("source raster maxzoom 9 (overzoom di atasnya), atribusi NASA GIBS, glyphs raster", () => {
    const s = gibsStyle("2026-10-01");
    const src = s.sources["nasa-gibs"];
    expect(src).toMatchObject({ type: "raster", tileSize: 256, maxzoom: GIBS_MAXZOOM });
    expect(GIBS_MAXZOOM).toBe(9);
    expect(JSON.stringify(src)).toContain("NASA GIBS");
    expect(s.glyphs).toContain("openmaptiles");
    expect(s.layers[0]).toMatchObject({ type: "raster", source: "nasa-gibs" });
  });
});

describe("gibsImageryDate", () => {
  const now = new Date("2026-10-08T11:55:00Z"); // 18.55 WIB

  it("ada titik api → tanggal akuisisi UTC terbaru (bukan urutan fitur)", () => {
    expect(gibsImageryDate(fc(["2026-10-05T06:30:00Z", "2026-10-07T18:10:00Z", "2026-10-06T06:20:00Z"]), { now, month: null })).toBe(
      "2026-10-07"
    );
  });

  it("acqDatetime kosong/tak valid diabaikan", () => {
    expect(gibsImageryDate(fc([null, "bukan-tanggal", "2026-10-03T06:00:00Z"]), { now, month: null })).toBe("2026-10-03");
  });

  it("rentang live tanpa titik api → kemarin UTC (citra hari ini belum tentu utuh)", () => {
    expect(gibsImageryDate(fc([]), { now, month: null })).toBe("2026-10-07");
    expect(gibsImageryDate(null, { now, month: null })).toBe("2026-10-07");
    // 00.30 WIB 9 Okt = 8 Okt 17.30 UTC → kemarin UTC = 7 Okt.
    expect(gibsImageryDate(null, { now: new Date("2026-10-08T17:30:00Z"), month: null })).toBe("2026-10-07");
  });

  it("mode Bulan tanpa titik api → hari terakhir bulan, paling lambat kemarin", () => {
    expect(gibsImageryDate(null, { now, month: "2026-02" })).toBe("2026-02-28");
    expect(gibsImageryDate(null, { now, month: "2024-02" })).toBe("2024-02-29");
    expect(gibsImageryDate(null, { now, month: "2026-10" })).toBe("2026-10-07");
  });

  it("formatGibsDate: tanggal UTC tanpa geser zona", () => {
    expect(formatGibsDate("2026-10-08")).toBe("8 Okt 2026");
  });
});
