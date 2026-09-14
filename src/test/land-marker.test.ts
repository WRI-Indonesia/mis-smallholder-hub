import { describe, it, expect } from "vitest";
import {
  MARKER_SNAP_M,
  MARKER_MAX_DISTANCE_M,
  distanceMeters,
  orderClockwiseFromNorth,
  planMarkersFromVertices,
  checkMarkerNearParcel,
  fmtCoord,
  type NearbyMarker,
} from "@/lib/land-marker";

/**
 * Helper murni patok batas (#329). Aturan yang dijaga: penomoran deterministik
 * (searah jarum jam dari utara — sama di layar, PDF, ekspor), snap ≤ 5 m ke
 * patok yang ada (patok bersama, bukan digandakan), idempoten saat dijalankan
 * ulang, dan guard lat/long tertukar.
 */

// Persegi ≈ 100 m di sekitar (101.19, 0.52); 0.0009° ≈ 100 m.
const D = 0.0009;
const SQUARE = [
  { lon: 101.19, lat: 0.52 }, // barat-daya
  { lon: 101.19 + D, lat: 0.52 }, // tenggara
  { lon: 101.19 + D, lat: 0.52 + D }, // timur-laut
  { lon: 101.19, lat: 0.52 + D }, // barat-laut
];

const nearby = (id: string, lon: number, lat: number, o: Partial<NearbyMarker> = {}): NearbyMarker => ({
  id,
  lon,
  lat,
  parcelIds: ["LHN-B"],
  linkedToThisParcel: false,
  ...o,
});

describe("distanceMeters — haversine", () => {
  it("0.0009° di ekuator ≈ 100 m", () => {
    expect(distanceMeters({ lon: 101.19, lat: 0.52 }, { lon: 101.19 + D, lat: 0.52 })).toBeCloseTo(100.2, 0);
  });
  it("titik sama → 0", () => {
    expect(distanceMeters(SQUARE[0], SQUARE[0])).toBe(0);
  });
});

describe("orderClockwiseFromNorth — nomor patok deterministik", () => {
  it("mulai dari vertex paling utara (seri → bujur terkecil), lalu searah jarum jam", () => {
    const ordered = orderClockwiseFromNorth(SQUARE);
    // Dua vertex utara sama lintangnya → barat-laut (bujur terkecil) duluan, lalu timur-laut, tenggara, barat-daya.
    expect(ordered.map((p) => [p.lon, p.lat])).toEqual([
      [101.19, 0.52 + D],
      [101.19 + D, 0.52 + D],
      [101.19 + D, 0.52],
      [101.19, 0.52],
    ]);
  });

  it("urutan masukan tidak memengaruhi hasil (deterministik)", () => {
    const shuffled = [SQUARE[2], SQUARE[0], SQUARE[3], SQUARE[1]];
    expect(orderClockwiseFromNorth(shuffled)).toEqual(orderClockwiseFromNorth(SQUARE));
  });

  it("< 3 titik → dikembalikan apa adanya (bukan error)", () => {
    expect(orderClockwiseFromNorth([SQUARE[0], SQUARE[1]])).toEqual([SQUARE[0], SQUARE[1]]);
    expect(orderClockwiseFromNorth([])).toEqual([]);
  });
});

describe("planMarkersFromVertices — snap ≤ 5 m, patok bersama, idempoten", () => {
  it("tanpa patok di sekitar → semua vertex jadi patok baru bernomor 1..n", () => {
    const plan = planMarkersFromVertices(SQUARE, []);
    expect(plan.map((c) => c.sequenceNo)).toEqual([1, 2, 3, 4]);
    expect(plan.every((c) => c.existingMarkerId === null && !c.alreadyLinked && c.snapDistanceM === null)).toBe(true);
  });

  it("vertex ≤ 5 m dari patok lahan tetangga → DITAUTKAN ke patok itu (existingMarkerId + jarak + ID lahan pemakai)", () => {
    // 3 m di timur vertex barat-laut.
    const m = nearby("m1", 101.19 + 3 / 111_320, 0.52 + D);
    const plan = planMarkersFromVertices(SQUARE, [m]);
    const nw = plan.find((c) => c.lon === 101.19 && c.lat === 0.52 + D)!;
    expect(nw.existingMarkerId).toBe("m1");
    expect(nw.existingParcelIds).toEqual(["LHN-B"]);
    expect(nw.snapDistanceM).toBeCloseTo(3, 0);
    expect(nw.alreadyLinked).toBe(false);
    expect(plan.filter((c) => c.existingMarkerId).length).toBe(1);
  });

  it("vertex > 5 m dari patok yang ada → patok baru (tidak di-snap)", () => {
    const m = nearby("m1", 101.19 + 8 / 111_320, 0.52 + D);
    const plan = planMarkersFromVertices(SQUARE, [m], MARKER_SNAP_M);
    expect(plan.every((c) => c.existingMarkerId === null)).toBe(true);
  });

  it("satu patok hanya dipakai oleh satu vertex (yang terdekat) — dua vertex dekat patok yang sama tidak keduanya di-snap", () => {
    // Segitiga sempit: dua vertex berjarak 2 m, satu patok 1 m dari vertex A.
    const A = { lon: 101.19, lat: 0.52 };
    const B = { lon: 101.19 + 2 / 111_320, lat: 0.52 };
    const C = { lon: 101.19, lat: 0.52 + D };
    const m = nearby("m1", 101.19 + 1 / 111_320, 0.52 + 0.3 / 111_320);
    const plan = planMarkersFromVertices([A, B, C], [m]);
    expect(plan.filter((c) => c.existingMarkerId === "m1").length).toBe(1);
  });

  it("dijalankan ulang → vertex yang sudah tertaut ke lahan ini ditandai alreadyLinked (dilewati saat simpan)", () => {
    const existing = SQUARE.map((p, i) => nearby(`own-${i}`, p.lon, p.lat, { parcelIds: ["LHN-A"], linkedToThisParcel: true }));
    const plan = planMarkersFromVertices(SQUARE, existing);
    expect(plan.every((c) => c.alreadyLinked && c.existingMarkerId !== null)).toBe(true);
  });

  it("nomor mengikuti urutan searah jarum jam dari utara, bukan urutan vertex masukan", () => {
    const plan = planMarkersFromVertices([SQUARE[1], SQUARE[3], SQUARE[0], SQUARE[2]], []);
    expect(plan[0]).toMatchObject({ sequenceNo: 1, lon: 101.19, lat: 0.52 + D });
  });
});

describe("checkMarkerNearParcel — guard ≤ 100 m + deteksi lat/long tertukar", () => {
  it("≤ 100 m → null (sah)", () => {
    expect(checkMarkerNearParcel({ lon: 101.19, lat: 0.52 }, () => 42)).toBeNull();
    expect(checkMarkerNearParcel({ lon: 101.19, lat: 0.52 }, () => MARKER_MAX_DISTANCE_M)).toBeNull();
  });

  it("jauh, tetapi versi tertukar dekat → pesan menyebut lat/long tertukar", () => {
    const msg = checkMarkerNearParcel({ lon: 0.52, lat: 101.19 }, (p) => (p.lon === 101.19 ? 3 : 11_000_000));
    expect(msg).toMatch(/tertukar/);
    expect(msg).toContain("3 m");
  });

  it("jauh dan versi tertukar pun jauh → pesan periksa desimal/kolom dengan batas maks", () => {
    const msg = checkMarkerNearParcel({ lon: 101.2, lat: 0.6 }, () => 9_000);
    expect(msg).toMatch(/9000 m/);
    expect(msg).toContain(`maks ${MARKER_MAX_DISTANCE_M} m`);
    expect(msg).not.toMatch(/tertukar/);
  });
});

describe("fmtCoord", () => {
  it("6 desimal (≈ 0,1 m)", () => {
    expect(fmtCoord(101.1912345678)).toBe("101.191235");
    expect(fmtCoord(0.5)).toBe("0.500000");
  });
});
