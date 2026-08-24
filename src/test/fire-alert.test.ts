import { describe, it, expect } from "vitest";
import type { FeatureCollection, MultiPolygon } from "geojson";
import {
  classifyHotspots,
  combinedBbox,
  countHotspotsByGroup,
  countPointsByNamedArea,
  countUniqueInsideByDistrict,
  filterPointsWithinAreas,
  formatExportedAt,
  formatHotspotRange,
  hotspotWindowStart,
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

  it("menandai in/out + groupIds/groupName dan mempertahankan properti lama", () => {
    const fc = classifyHotspots(hotspotFc([[101.5, 0.5], [103.5, 0.5], [105, 0.5]]), boundaries);
    expect(fc.features.map((f) => f.properties?.inBoundary)).toEqual(["in", "in", "out"]);
    expect(fc.features[0].properties).toMatchObject({
      confidence: "n",
      groupIds: ["g1"],
      groupName: "Lembaga Satu",
    });
    expect(fc.features[2].properties).toMatchObject({ groupIds: [], groupName: null });
  });

  it("boundary BERSAMA (dua lembaga, poligon sama — KSJ & KBJ): titik diatribusikan ke keduanya", () => {
    const shared = indexBoundaries([
      boundary({ farmerGroupId: "kbj", name: "Koperasi Beringin Jaya", geometry: square(101, 0, 102, 1) }),
      boundary({ farmerGroupId: "ksj", name: "Koperasi Sawit Jaya", geometry: square(101, 0, 102, 1) }),
    ]);
    const fc = classifyHotspots(hotspotFc([[101.5, 0.5]]), shared);
    expect(fc.features[0].properties).toMatchObject({
      inBoundary: "in",
      groupIds: ["kbj", "ksj"],
      groupName: "Koperasi Beringin Jaya & Koperasi Sawit Jaya",
    });
    // Rekap: dihitung di TIAP pemilik + penanda `shared` (dasar keterangan
    // anti-double-counting); ringkasan: titik unik tetap 1, lembaga terdampak 2.
    const rows = countHotspotsByGroup(fc, shared);
    expect(rows.map((r) => [r.name, r.count, r.shared])).toEqual([
      ["Koperasi Beringin Jaya", 1, 1],
      ["Koperasi Sawit Jaya", 1, 1],
    ]);
    expect(summarizeFire(fc)).toEqual({
      total: 1,
      inside: 1,
      outside: 0,
      insideShared: 1,
      groupsAffected: 2,
    });
  });

  it("summarizeFire menghitung total/inside/outside/lembaga terdampak", () => {
    const fc = classifyHotspots(hotspotFc([[101.5, 0.5], [101.6, 0.6], [105, 0.5]]), boundaries);
    expect(summarizeFire(fc)).toEqual({
      total: 3,
      inside: 2,
      outside: 1,
      insideShared: 0,
      groupsAffected: 1,
    });
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

  // #274 — FarmerGroup→boundary 1-ke-banyak tanpa unique constraint: satu
  // lembaga dengan 2 boundary aktif (mis. seed gagal antara soft-delete dan
  // insert) tidak boleh muncul dobel atau menghitung titiknya dua kali.
  it("lembaga dengan >1 boundary aktif tetap satu baris, tanpa hitungan dobel", () => {
    const dua = [
      boundary({ id: "b-g1-lama", farmerGroupId: "g1", name: "Alpha", geometry: square(101, 0, 102, 1) }),
      boundary({ id: "b-g1-baru", farmerGroupId: "g1", name: "Alpha", geometry: square(101, 0, 102, 1) }),
      boundary({ farmerGroupId: "g2", name: "Beta", geometry: square(103, 0, 104, 1) }),
    ];
    const fc = classifyHotspots(hotspotFc([[101.5, 0.5], [101.6, 0.5]]), indexBoundaries(dua));
    const rows = countHotspotsByGroup(fc, dua);
    expect(rows.map((r) => [r.name, r.count, r.shared])).toEqual([
      ["Alpha", 2, 0],
      ["Beta", 0, 0],
    ]);
    // Penyebut kartu "Lembaga Terdampak" ikut benar.
    expect(summarizeFire(fc).groupsAffected).toBe(1);
  });

  it("boundary ganda satu lembaga tidak tertandai 'bersama'", () => {
    const dua = [
      boundary({ id: "b-x1", farmerGroupId: "g1", name: "Alpha", geometry: square(101, 0, 102, 1) }),
      boundary({ id: "b-x2", farmerGroupId: "g1", name: "Alpha", geometry: square(101, 0, 102, 1) }),
    ];
    const fc = classifyHotspots(hotspotFc([[101.5, 0.5]]), indexBoundaries(dua));
    expect(fc.features[0].properties?.groupIds).toEqual(["g1"]);
    expect(fc.features[0].properties?.groupName).toBe("Alpha");
    expect(summarizeFire(fc).insideShared).toBe(0);
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

describe("countUniqueInsideByDistrict", () => {
  const shared = square(101, 0, 102, 1);
  const bounds = [
    // KSJ & KBJ berbagi satu poligon (#268) — dua lembaga, satu distrik.
    boundary({ farmerGroupId: "ksj", districtId: "d1", districtName: "Kampar", geometry: shared }),
    boundary({ farmerGroupId: "kbj", districtId: "d1", districtName: "Kampar", geometry: shared }),
    boundary({ farmerGroupId: "sk", districtId: "d2", districtName: "Siak", geometry: square(103, 0, 104, 1) }),
  ];

  it("titik di boundary bersama dihitung SEKALI per distrik (cocok dgn kartu)", () => {
    const classified = classifyHotspots(hotspotFc([[101.5, 0.5]]), indexBoundaries(bounds));
    // countHotspotsByGroup sengaja menghitung per pemilik → 1 + 1 = 2.
    expect(
      countHotspotsByGroup(classified, bounds)
        .filter((r) => r.districtId === "d1")
        .reduce((sum, r) => sum + r.count, 0)
    ).toBe(2);
    // Rincian tooltip menghitung titik unik → 1, sama dengan summarizeFire.
    expect(countUniqueInsideByDistrict(classified, bounds)).toEqual([
      { name: "Kampar", count: 1 },
      { name: "Siak", count: 0 },
    ]);
    expect(summarizeFire(classified).inside).toBe(1);
  });

  it("titik di luar semua boundary tidak dihitung", () => {
    const classified = classifyHotspots(hotspotFc([[105, 0.5]]), indexBoundaries(bounds));
    expect(countUniqueInsideByDistrict(classified, bounds).every((d) => d.count === 0)).toBe(true);
  });
});

describe("label rentang waktu laporan", () => {
  it("5 hari = 5 hari kalender TERMASUK hari ini (mundur 4 hari, bukan 5)", () => {
    const now = new Date("2026-08-19T07:55:00Z"); // 19 Agu 14.55 WIB
    expect(formatHotspotRange(hotspotWindowStart(now, 5), now)).toBe("15–19 Agu 2026");
  });

  it("24 jam = bergulir 1×24 jam", () => {
    const now = new Date("2026-08-19T07:55:00Z");
    expect(formatHotspotRange(hotspotWindowStart(now, 1), now)).toBe("18–19 Agu 2026");
  });

  it("lintas bulan ditulis penuh di kedua sisi", () => {
    const now = new Date("2026-09-02T07:55:00Z");
    expect(formatHotspotRange(hotspotWindowStart(now, 5), now)).toBe("29 Agu 2026 – 2 Sep 2026");
  });

  it("10 & 30 hari mengikuti satuan hari UTC FIRMS (#284)", () => {
    const now = new Date("2026-08-24T10:00:00Z");
    expect(formatHotspotRange(hotspotWindowStart(now, 10), now)).toBe("15–24 Agu 2026");
    expect(formatHotspotRange(hotspotWindowStart(now, 30), now)).toBe("26 Jul 2026 – 24 Agu 2026");
  });

  it("00.00–07.00 WIB: awal rentang mengikuti tanggal UTC, bukan mundur N×24 jam (#281)", () => {
    // 20 Agu 06.00 WIB = 19 Agu 23.00 UTC → FIRMS 5 hari = UTC 15–19 Agu,
    // yang dalam WIB berlangsung 15 Agu 07.00 s.d. 20 Agu 06.59 → "15–20 Agu".
    const now = new Date("2026-08-19T23:00:00Z");
    expect(formatHotspotRange(hotspotWindowStart(now, 5), now)).toBe("15–20 Agu 2026");
    // Sebaliknya 23.00 WIB (16.00 UTC) hari yang sama tetap "15–19 Agu".
    const evening = new Date("2026-08-19T16:00:00Z");
    expect(formatHotspotRange(hotspotWindowStart(evening, 5), evening)).toBe("15–19 Agu 2026");
  });

  it("tanggal & jam sama-sama dibaca WIB, bukan zona browser", () => {
    // 23.00 UTC 19 Agu = 06.00 WIB 20 Agu — tanggalnya harus ikut maju.
    expect(formatExportedAt(new Date("2026-08-19T23:00:00Z"))).toBe("20 Agu 2026, 06.00 WIB");
  });
});
