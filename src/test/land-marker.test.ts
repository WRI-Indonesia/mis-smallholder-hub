import { describe, it, expect } from "vitest";
import {
  MARKER_SNAP_M,
  MARKER_MAX_DISTANCE_M,
  markerCodePrefix,
  formatMarkerCode,
  normalizeMarkerCode,
  distanceMeters,
  orderClockwiseFromNorth,
  planMarkersFromVertices,
  checkMarkerNearParcel,
  fmtCoord,
  uniqueMarkerRows,
  groupMarkersByParcel,
  type NearbyMarker,
  type MarkerLinkRow,
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

describe("orderClockwiseFromNorth — nomor patok mengikuti jalan batas", () => {
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

  it("ring berlawanan jarum jam (orientasi PostGIS/shapefile bebas) → dibalik, hasil sama", () => {
    expect(orderClockwiseFromNorth([...SQUARE].reverse())).toEqual(orderClockwiseFromNorth(SQUARE));
  });

  it("titik awal ring berbeda → hasil sama (hanya diputar, tidak diurutkan ulang)", () => {
    const rotated = [SQUARE[2], SQUARE[3], SQUARE[0], SQUARE[1]];
    expect(orderClockwiseFromNorth(rotated)).toEqual(orderClockwiseFromNorth(SQUARE));
  });

  it("poligon cekung (bentuk U) → nomor menyusuri batas, tidak melompat menyeberangi cekungan (temuan review 2026-09-14)", () => {
    // U: (0,0)(3,0)(3,3)(2,3)(2,1)(1,1)(1,3)(0,3) — dua 'lengan' di utara, cekungan di tengah.
    const u = (x: number, y: number) => ({ lon: 101 + x * D, lat: 0.5 + y * D });
    const ring = [u(0, 0), u(3, 0), u(3, 3), u(2, 3), u(2, 1), u(1, 1), u(1, 3), u(0, 3)];
    const ordered = orderClockwiseFromNorth(ring).map((p) => [Math.round((p.lon - 101) / D), Math.round((p.lat - 0.5) / D)]);
    // Dari barat-laut (0,3) searah jarum jam: (1,3) → turun ke (1,1) → (2,1) → naik ke (2,3) → (3,3) → (3,0) → (0,0).
    expect(ordered).toEqual([[0, 3], [1, 3], [1, 1], [2, 1], [2, 3], [3, 3], [3, 0], [0, 0]]);
  });

  it("< 3 titik → dikembalikan apa adanya (bukan error)", () => {
    expect(orderClockwiseFromNorth([SQUARE[0], SQUARE[1]])).toEqual([SQUARE[0], SQUARE[1]]);
    expect(orderClockwiseFromNorth([])).toEqual([]);
  });
});

describe("planMarkersFromVertices — snap ≤ 5 m, patok bersama, idempoten", () => {
  it("tanpa patok di sekitar → semua vertex jadi patok baru bernomor 1..n", () => {
    const plan = planMarkersFromVertices([SQUARE], []);
    expect(plan.map((c) => c.sequenceNo)).toEqual([1, 2, 3, 4]);
    expect(plan.every((c) => c.existingMarkerId === null && !c.alreadyLinked && c.snapDistanceM === null)).toBe(true);
  });

  it("vertex ≤ 5 m dari patok lahan tetangga → DITAUTKAN ke patok itu (existingMarkerId + jarak + ID lahan pemakai)", () => {
    // 3 m di timur vertex barat-laut.
    const m = nearby("m1", 101.19 + 3 / 111_320, 0.52 + D);
    const plan = planMarkersFromVertices([SQUARE], [m]);
    const nw = plan.find((c) => c.lon === 101.19 && c.lat === 0.52 + D)!;
    expect(nw.existingMarkerId).toBe("m1");
    expect(nw.existingParcelIds).toEqual(["LHN-B"]);
    expect(nw.snapDistanceM).toBeCloseTo(3, 0);
    expect(nw.alreadyLinked).toBe(false);
    expect(plan.filter((c) => c.existingMarkerId).length).toBe(1);
  });

  it("vertex > 5 m dari patok yang ada → patok baru (tidak di-snap)", () => {
    const m = nearby("m1", 101.19 + 8 / 111_320, 0.52 + D);
    const plan = planMarkersFromVertices([SQUARE], [m], MARKER_SNAP_M);
    expect(plan.every((c) => c.existingMarkerId === null)).toBe(true);
  });

  it("satu patok hanya dipakai oleh satu vertex (yang terdekat) — dua vertex dekat patok yang sama tidak keduanya di-snap", () => {
    // Segitiga sempit: dua vertex berjarak 2 m, satu patok 1 m dari vertex A.
    const A = { lon: 101.19, lat: 0.52 };
    const B = { lon: 101.19 + 2 / 111_320, lat: 0.52 };
    const C = { lon: 101.19, lat: 0.52 + D };
    const m = nearby("m1", 101.19 + 1 / 111_320, 0.52 + 0.3 / 111_320);
    const plan = planMarkersFromVertices([[A, B, C]], [m]);
    expect(plan.filter((c) => c.existingMarkerId === "m1").length).toBe(1);
  });

  it("patok direbut vertex TERDEKAT secara global, bukan vertex bernomor lebih dulu — 4,5 m dari V1 (utara) & 1 m dari V2 → V2 yang menaut (review 2026-09-15)", () => {
    // V1 paling utara (nomor 1), V2 4 m di selatannya; patok M 1 m di bawah V2 (4,5 m dari V1 — masih ≤ 5 m).
    const V1 = { lon: 101.19, lat: 0.52 + 4 / 111_320 };
    const V2 = { lon: 101.19, lat: 0.52 };
    const V3 = { lon: 101.19 + D, lat: 0.52 };
    const V4 = { lon: 101.19 + D, lat: 0.52 + D };
    const m = nearby("m1", 101.19, 0.52 - 1 / 111_320);
    const plan = planMarkersFromVertices([[V1, V2, V3, V4]], [m]);
    const linked = plan.filter((c) => c.existingMarkerId === "m1");
    expect(linked.length).toBe(1);
    expect(linked[0].snapDistanceM).toBeCloseTo(1, 0);
    expect(plan.find((c) => c.lat === V1.lat)?.existingMarkerId).toBeNull();
  });

  it("dijalankan ulang → vertex yang sudah tertaut ke lahan ini ditandai alreadyLinked (dilewati saat simpan)", () => {
    const existing = SQUARE.map((p, i) => nearby(`own-${i}`, p.lon, p.lat, { parcelIds: ["LHN-A"], linkedToThisParcel: true }));
    const plan = planMarkersFromVertices([SQUARE], existing);
    expect(plan.every((c) => c.alreadyLinked && c.existingMarkerId !== null)).toBe(true);
  });

  it("nomor mulai dari vertex paling utara apa pun titik awal ring; multipoligon dinomori bagian demi bagian", () => {
    const plan = planMarkersFromVertices([[SQUARE[2], SQUARE[3], SQUARE[0], SQUARE[1]]], []);
    expect(plan[0]).toMatchObject({ sequenceNo: 1, lon: 101.19, lat: 0.52 + D });
    const far = SQUARE.map((p) => ({ lon: p.lon + 10 * D, lat: p.lat }));
    const two = planMarkersFromVertices([SQUARE, far], []);
    expect(two.map((c) => c.sequenceNo)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(two[4]).toMatchObject({ lon: far[3].lon, lat: far[3].lat });
  });
});

describe("checkMarkerNearParcel — guard ≤ 100 m + deteksi lat/long tertukar", () => {
  it("≤ 100 m → null (sah)", () => {
    expect(checkMarkerNearParcel({ lon: 101.19, lat: 0.52 }, () => 42)).toBeNull();
    expect(checkMarkerNearParcel({ lon: 101.19, lat: 0.52 }, () => MARKER_MAX_DISTANCE_M)).toBeNull();
  });

  it("jarak tak-hingga (lahan tanpa geom valid) → guard dilewati, bukan pesan 'Infinity m'", () => {
    expect(checkMarkerNearParcel({ lon: 101.19, lat: 0.52 }, () => Number.POSITIVE_INFINITY)).toBeNull();
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

describe("uniqueMarkerRows — unduhan patok satu baris per patok fisik (keputusan owner 2026-09-14)", () => {
  const link = (o: Partial<MarkerLinkRow>): MarkerLinkRow => ({
    markerId: "m1", code: "HJP-PTK-000001", parcelId: "HJP.0001.A", farmerCode: "P-1", farmerName: "Budi", groupName: "KP HJP",
    subGroupLv2: null, blok: "31 G", sequenceNo: 1, latitude: 0.52, longitude: 101.19, condition: "PRESENT", type: null,
    installedAt: null, installedBy: null, source: "POLYGON_VERTEX", nkt: false, notes: null, ...o,
  });

  it("patok bersama → satu baris; kolom lahan = 'ID Petani · ID Lahan #no' dipisah koma, urut ID Lahan; NKT bila salah satu lahan kena", () => {
    const rows = uniqueMarkerRows([
      link({ parcelId: "HJP.0002.B", farmerCode: "P-2", farmerName: "Cici", sequenceNo: 4, nkt: true }),
      link({ parcelId: "HJP.0001.A", farmerCode: "P-1", sequenceNo: 1 }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].lahan).toBe("Budi · P-1 · HJP.0001.A #1\nCici · P-2 · HJP.0002.B #4");
    expect(rows[0].farmerNames).toBe("Budi, Cici");
    expect(rows[0].parcelCount).toBe(2);
    expect(rows[0].nkt).toBe(true);
  });

  it("nktParcelsOnly: kolom Lahan hanya lahan yang kena NKT (parcelNkt), pemakai bersih tetap dihitung", () => {
    const rows = uniqueMarkerRows(
      [
        link({ parcelId: "HJP.0002.B", farmerCode: "P-2", farmerName: "Cici", sequenceNo: 4, nkt: true, parcelNkt: true }),
        link({ parcelId: "HJP.0001.A", farmerCode: "P-1", nkt: true, parcelNkt: false }),
      ],
      { nktParcelsOnly: true },
    );
    expect(rows[0].lahan).toBe("Cici · P-2 · HJP.0002.B #4");
    expect(rows[0].parcelCount).toBe(2);
  });

  it("urut Kelompok Tani lalu Blok (numerik-aware), kosong di akhir; KT/Blok patok bersama = nilai terkecil di antara lahan pemakainya", () => {
    const rows = uniqueMarkerRows([
      link({ markerId: "a", subGroupLv2: "KT Maju", blok: "10" }),
      link({ markerId: "b", subGroupLv2: "KT Maju", blok: "2" }),
      link({ markerId: "c", subGroupLv2: null, blok: "1" }),
      link({ markerId: "d", subGroupLv2: "KT Bersama", blok: "5" }),
      link({ markerId: "d", parcelId: "HJP.0009.Z", subGroupLv2: "KT Aman", blok: "7" }),
    ]);
    expect(rows.map((r) => r.markerId)).toEqual(["d", "b", "a", "c"]);
    expect(rows[0]).toMatchObject({ subGroupLv2: "KT Aman", blok: "5" });
  });
});

describe("kode patok <SINGKATAN>-PTK-000123 (keputusan owner 2026-09-14)", () => {
  it("awalan dari singkatan Lembaga: huruf besar tanpa spasi/tanda baca; fallback kode Lembaga; lalu MIS", () => {
    expect(markerCodePrefix("HJP", "ISH-1401-03")).toBe("HJP");
    expect(markerCodePrefix("FPS SGO", "ISH-1401-05")).toBe("FPSSGO");
    expect(markerCodePrefix("KUD MULIA", null)).toBe("KUDMULIA");
    expect(markerCodePrefix(null, "ISH-1405-10")).toBe("ISH140510");
    expect(markerCodePrefix(" ", "")).toBe("MIS");
  });
  it("format 6 digit; normalisasi kode dari sel (huruf kecil, spasi di sekitar tanda hubung) — bentuk lain ditolak", () => {
    expect(formatMarkerCode("HJP", 123)).toBe("HJP-PTK-000123");
    expect(normalizeMarkerCode(" hjp - ptk - 000123 ")).toBe("HJP-PTK-000123");
    expect(normalizeMarkerCode("HJP-PTK-7")).toBe("HJP-PTK-7");
    expect(normalizeMarkerCode("Patok-HJP-000123")).toBeNull();
    expect(normalizeMarkerCode("")).toBeNull();
  });
});

describe("groupMarkersByParcel — tabel PDF per lahan (owner 2026-09-14: jangan ulangi nama/ID petani per patok)", () => {
  const link = (o: Partial<MarkerLinkRow>): MarkerLinkRow => ({
    markerId: "m1", code: "HJP-PTK-000001", parcelId: "HJP.0009.D", farmerCode: "P-9", farmerName: "Agus", groupName: "KP HJP",
    subGroupLv2: null, blok: "15 L", sequenceNo: 1, latitude: 0.52, longitude: 101.19, condition: "PRESENT", type: null,
    installedAt: null, installedBy: null, source: "GPS", nkt: true, parcelNkt: true, notes: null, ...o,
  });
  it("satu baris per lahan; patok urut nomor lahan dengan nomor peta dari daftar unik; nktOnly membuang lahan bersih", () => {
    const rows = [
      link({ markerId: "a", code: "HJP-PTK-000001", sequenceNo: 2 }),
      link({ markerId: "b", code: "HJP-PTK-000002", sequenceNo: 1 }),
      link({ markerId: "b", code: "HJP-PTK-000002", parcelId: "HJP.0010.A", farmerName: "Budi", farmerCode: "P-10", sequenceNo: 4, nkt: true, parcelNkt: false }),
    ];
    const unique = uniqueMarkerRows(rows);
    const all = groupMarkersByParcel(rows, unique);
    expect(all.map((g) => g.parcelId)).toEqual(["HJP.0009.D", "HJP.0010.A"]);
    expect(all[0].markers.map((m) => `${m.mapNo}:${m.sequenceNo}`)).toEqual([`${unique.findIndex((u) => u.markerId === "b") + 1}:1`, `${unique.findIndex((u) => u.markerId === "a") + 1}:2`]);
    const nkt = groupMarkersByParcel(rows, unique, { nktOnly: true });
    expect(nkt.map((g) => g.parcelId)).toEqual(["HJP.0009.D"]);
  });
});
