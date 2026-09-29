import { describe, it, expect, vi } from "vitest";
import shpwrite from "@mapbox/shp-write";
import type { FeatureCollection } from "geojson";
import { parseShapefileZip } from "@/lib/shapefile-server";

/**
 * Parser ZIP shapefile server `src/lib/shapefile-server.ts` ASLI (#238) —
 * round-trip: ZIP dibuat shp-write di test, di-base64 seperti kiriman klien,
 * lalu diurai. Tanpa berkas fixture, tanpa jaringan.
 */
async function zipBase64(fc: FeatureCollection, layer: string): Promise<string> {
  const buf = await shpwrite.zip<"nodebuffer">(fc, { outputType: "nodebuffer", compression: "STORE", types: { polygon: layer, point: layer } });
  return Buffer.from(buf).toString("base64");
}

const square = (x: number) => [[[x, 0], [x, 1], [x + 1, 1], [x + 1, 0], [x, 0]]];

describe("parseShapefileZip", () => {
  it("ZIP poligon valid → fitur ber-index urut dengan atribut DBF & geometri WGS84", async () => {
    const fc: FeatureCollection = {
      type: "FeatureCollection",
      features: [
        { type: "Feature", geometry: { type: "Polygon", coordinates: square(101) }, properties: { ID_LAHAN: "HJP.1", LUAS: 1.5 } },
        { type: "Feature", geometry: { type: "Polygon", coordinates: square(103) }, properties: { ID_LAHAN: "HJP.2", LUAS: 2 } },
      ],
    };
    const res = await parseShapefileZip(await zipBase64(fc, "lahan"));
    expect(res.success).toBe(true);
    expect(res.features?.map((f) => f.index)).toEqual([0, 1]);
    expect(res.features?.map((f) => f.properties.ID_LAHAN)).toEqual(["HJP.1", "HJP.2"]);
    expect(res.features?.[0].geometry?.type).toBe("Polygon");
    const coords = (res.features?.[0].geometry as { coordinates: number[][][] }).coordinates[0];
    expect(coords.map(([lon]) => lon)).toEqual(expect.arrayContaining([101, 102]));
  });

  it("ZIP berisi dua layer (poligon + titik) → fitur digabung dari semua FeatureCollection", async () => {
    const fc: FeatureCollection = {
      type: "FeatureCollection",
      features: [
        { type: "Feature", geometry: { type: "Polygon", coordinates: square(0) }, properties: { K: "a" } },
        { type: "Feature", geometry: { type: "Point", coordinates: [5, 5] }, properties: { K: "b" } },
      ],
    };
    const buf = await shpwrite.zip<"nodebuffer">(fc, { outputType: "nodebuffer", compression: "STORE", types: { polygon: "poli", point: "titik" } });
    const res = await parseShapefileZip(Buffer.from(buf).toString("base64"));
    expect(res.success).toBe(true);
    expect(res.features?.map((f) => f.properties.K).sort()).toEqual(["a", "b"]);
    expect(res.features?.map((f) => f.index)).toEqual([0, 1]);
  });

  it("data bukan ZIP → success false dengan pesan galat, tidak melempar", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await parseShapefileZip(Buffer.from("bukan zip").toString("base64"));
    expect(res.success).toBe(false);
    expect(typeof res.error).toBe("string");
    expect(res.error!.length).toBeGreaterThan(0);
    spy.mockRestore();
  });
});
