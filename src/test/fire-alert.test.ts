import { describe, it, expect } from "vitest";
import type { FeatureCollection, MultiPolygon } from "geojson";
import {
  classifyHotspots,
  combinedBbox,
  countHotspotsByGroup,
  countPointsByNamedArea,
  filterPointsWithinAreas,
  findContainingBoundary,
  indexBoundaries,
  multiPolygonBbox,
  pointInMultiPolygon,
  summarizeFire,
  type FireBoundary,
} from "@/lib/fire-alert";

// Unit test Dashboard Fire Alert (#266): klasifikasi titik api terhadap
// boundary lembaga (point-in-polygon) + rekap per lembaga.

/** Persegi [w,s,e,n] sebagai MultiPolygon. */
const square = (w: number, s: number, e: number, n: number): MultiPolygon => ({
  type: "MultiPolygon",
  coordinates: [[[[w, s], [e, s], [e, n], [w, n], [w, s]]]],
});

const boundary = (over: Partial<FireBoundary> & { farmerGroupId: string }): FireBoundary => ({
  id: `b-${over.farmerGroupId}`,
  name: over.farmerGroupId.toUpperCase(),
  districtId: "d1",
  districtName: "Kampar",
  geometry: square(101, 0, 102, 1),
  ...over,
});

const hotspotFc = (coords: [number, number][]): FeatureCollection => ({
  type: "FeatureCollection",
  features: coords.map(([lng, lat]) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [lng, lat] },
    properties: { confidence: "n" },
  })),
});

describe("multiPolygonBbox & combinedBbox", () => {
  it("menghitung bbox [w,s,e,n] dari MultiPolygon", () => {
    expect(multiPolygonBbox(square(101, -0.5, 102, 1))).toEqual([101, -0.5, 102, 1]);
  });

  it("combinedBbox menggabungkan beberapa boundary; kosong → null", () => {
    const idx = indexBoundaries([
      boundary({ farmerGroupId: "a", geometry: square(101, 0, 102, 1) }),
      boundary({ farmerGroupId: "b", geometry: square(103, -1, 104, 0.5) }),
    ]);
    expect(combinedBbox(idx)).toEqual([101, -1, 104, 1]);
    expect(combinedBbox([])).toBeNull();
  });
});

describe("pointInMultiPolygon", () => {
  it("dalam / luar persegi sederhana", () => {
    const geom = square(101, 0, 102, 1);
    expect(pointInMultiPolygon([101.5, 0.5], geom)).toBe(true);
    expect(pointInMultiPolygon([100.9, 0.5], geom)).toBe(false);
    expect(pointInMultiPolygon([101.5, 1.5], geom)).toBe(false);
  });

  it("titik dalam lubang (hole) dihitung di luar", () => {
    const donat: MultiPolygon = {
      type: "MultiPolygon",
      coordinates: [
        [
          [[101, 0], [102, 0], [102, 1], [101, 1], [101, 0]],
          [[101.4, 0.4], [101.6, 0.4], [101.6, 0.6], [101.4, 0.6], [101.4, 0.4]],
        ],
      ],
    };
    expect(pointInMultiPolygon([101.5, 0.5], donat)).toBe(false); // di lubang
    expect(pointInMultiPolygon([101.1, 0.5], donat)).toBe(true); // di cincin
  });

  it("MultiPolygon multi-bagian: cukup salah satu bagian memuat titik", () => {
    const dua: MultiPolygon = {
      type: "MultiPolygon",
      coordinates: [...square(101, 0, 101.4, 1).coordinates, ...square(102, 0, 102.4, 1).coordinates],
    };
    expect(pointInMultiPolygon([102.2, 0.5], dua)).toBe(true);
    expect(pointInMultiPolygon([101.7, 0.5], dua)).toBe(false); // celah di antara
  });
});

describe("findContainingBoundary & classifyHotspots", () => {
  const boundaries = indexBoundaries([
    boundary({ farmerGroupId: "g1", name: "Lembaga Satu", geometry: square(101, 0, 102, 1) }),
    boundary({ farmerGroupId: "g2", name: "Lembaga Dua", geometry: square(103, 0, 104, 1), districtId: "d2", districtName: "Siak" }),
  ]);

  it("bbox pre-check tidak salah menolak titik di dalam", () => {
    expect(findContainingBoundary([103.5, 0.5], boundaries)?.farmerGroupId).toBe("g2");
    expect(findContainingBoundary([100, 0.5], boundaries)).toBeNull();
  });

  it("menandai in/out + groupId/groupName dan mempertahankan properti lama", () => {
    const fc = classifyHotspots(hotspotFc([[101.5, 0.5], [103.5, 0.5], [105, 0.5]]), boundaries);
    expect(fc.features.map((f) => f.properties?.inBoundary)).toEqual(["in", "in", "out"]);
    expect(fc.features[0].properties).toMatchObject({
      confidence: "n",
      groupId: "g1",
      groupName: "Lembaga Satu",
    });
    expect(fc.features[2].properties).toMatchObject({ groupId: null, groupName: null });
  });

  it("summarizeFire menghitung total/inside/outside/lembaga terdampak", () => {
    const fc = classifyHotspots(hotspotFc([[101.5, 0.5], [101.6, 0.6], [105, 0.5]]), boundaries);
    expect(summarizeFire(fc)).toEqual({ total: 3, inside: 2, outside: 1, groupsAffected: 1 });
  });
});

describe("countHotspotsByGroup", () => {
  const plain = [
    boundary({ farmerGroupId: "g1", name: "Alpha", geometry: square(101, 0, 102, 1) }),
    boundary({ farmerGroupId: "g2", name: "Beta", geometry: square(103, 0, 104, 1) }),
    boundary({ farmerGroupId: "g3", name: "Gamma", geometry: square(105, 0, 106, 1) }),
  ];
  const boundaries = indexBoundaries(plain);

  it("lembaga tanpa titik tetap muncul (count 0); urut jumlah desc lalu nama", () => {
    const fc = classifyHotspots(
      hotspotFc([[103.5, 0.5], [103.6, 0.5], [101.5, 0.5], [100, 0]]),
      boundaries
    );
    const rows = countHotspotsByGroup(fc, plain);
    expect(rows.map((r) => [r.name, r.count])).toEqual([
      ["Beta", 2],
      ["Alpha", 1],
      ["Gamma", 0],
    ]);
  });

  it("tanpa titik sama sekali → semua 0, urut nama", () => {
    const rows = countHotspotsByGroup({ type: "FeatureCollection", features: [] }, plain);
    expect(rows.map((r) => r.name)).toEqual(["Alpha", "Beta", "Gamma"]);
    expect(rows.every((r) => r.count === 0)).toBe(true);
  });
});

describe("filterPointsWithinAreas", () => {
  it("membuang titik di luar semua wilayah; tanpa wilayah → apa adanya (fallback)", () => {
    const areas = [{ geometry: square(101, 0, 102, 1) }, { geometry: square(103, 0, 104, 1) }];
    const fc = hotspotFc([[101.5, 0.5], [103.5, 0.5], [105, 0.5]]);
    const filtered = filterPointsWithinAreas(fc, areas);
    expect(filtered.features).toHaveLength(2);
    expect(filterPointsWithinAreas(fc, []).features).toHaveLength(3);
  });
});

describe("countPointsByNamedArea", () => {
  it("menghitung per wilayah (urutan input dipertahankan, 0 tetap muncul) + bucket lainnya", () => {
    const areas = [
      { name: "Kampar", geometry: square(101, 0, 102, 1) },
      { name: "Siak", geometry: square(103, 0, 104, 1) },
    ];
    const fc = hotspotFc([[101.5, 0.5], [101.6, 0.6], [105, 0.5]]);
    expect(countPointsByNamedArea(fc, areas, "Kab. Lainnya")).toEqual([
      { name: "Kampar", count: 2 },
      { name: "Siak", count: 0 },
      { name: "Kab. Lainnya", count: 1 },
    ]);
  });
});
