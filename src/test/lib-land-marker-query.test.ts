import { describe, it, expect, vi, beforeEach } from "vitest";
import { formatMarkerCode } from "@/lib/land-marker";

/**
 * Kueri PostGIS patok `src/lib/land-marker-query.ts` ASLI (#329/#331). SQL-nya
 * sendiri tidak dieksekusi (butuh PostGIS); yang diuji = olahan JS atas baris
 * `$queryRaw` (mock): pengelompokan ring, konversi numerik, urutan jarak,
 * dan penomoran kode patok atomik.
 */
const db = vi.hoisted(() => ({ $queryRaw: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const q = await import("@/lib/land-marker-query");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("fetchSimplifiedVertices", () => {
  it("satu array per bagian poligon, urutan batas dipertahankan, titik penutup ganda dibuang", async () => {
    db.$queryRaw.mockResolvedValue([
      { poly: 1, ring: 1, idx: 1, lon: "101.0", lat: "0.5" },
      { poly: 1, ring: 1, idx: 2, lon: 101.1, lat: 0.5 },
      { poly: 1, ring: 1, idx: 3, lon: 101.1, lat: 0.6 },
      { poly: 1, ring: 1, idx: 4, lon: 101.0, lat: 0.5 }, // penutup = titik pertama
      { poly: 2, ring: 1, idx: 1, lon: 102, lat: 1 },
      { poly: 2, ring: 1, idx: 2, lon: 102.1, lat: 1 },
      { poly: 2, ring: 1, idx: 3, lon: 102.1, lat: 1.1 },
      { poly: 2, ring: 1, idx: 4, lon: 102, lat: 1.1 },
    ]);
    const rings = await q.fetchSimplifiedVertices("lp-1");
    expect(rings).toEqual([
      [{ lon: 101, lat: 0.5 }, { lon: 101.1, lat: 0.5 }, { lon: 101.1, lat: 0.6 }],
      [{ lon: 102, lat: 1 }, { lon: 102.1, lat: 1 }, { lon: 102.1, lat: 1.1 }, { lon: 102, lat: 1.1 }],
    ]);
  });

  it("bagian dengan < 3 titik setelah penutup dibuang; lahan tanpa geom → []", async () => {
    db.$queryRaw.mockResolvedValueOnce([
      { poly: 1, ring: 1, idx: 1, lon: 1, lat: 1 },
      { poly: 1, ring: 1, idx: 2, lon: 2, lat: 2 },
      { poly: 1, ring: 1, idx: 3, lon: 1, lat: 1 },
    ]);
    expect(await q.fetchSimplifiedVertices("lp-1")).toEqual([]);
    db.$queryRaw.mockResolvedValueOnce([]);
    expect(await q.fetchSimplifiedVertices("lp-x")).toEqual([]);
  });
});

describe("fetchNearbyMarkers", () => {
  it("baris mentah → NearbyMarker (angka dinormalkan, parcel_ids null → [], boolean dipaksa)", async () => {
    db.$queryRaw.mockResolvedValue([
      { id: "m1", longitude: "101.5", latitude: "0.25", is_active: true, parcel_ids: ["A.1", "B.2"], linked_here: 1 },
      { id: "m2", longitude: 101.6, latitude: 0.26, is_active: false, parcel_ids: null, linked_here: null },
    ]);
    expect(await q.fetchNearbyMarkers("lp-1", "uid-1")).toEqual([
      { id: "m1", lon: 101.5, lat: 0.25, parcelIds: ["A.1", "B.2"], linkedToThisParcel: true, isActive: true },
      { id: "m2", lon: 101.6, lat: 0.26, parcelIds: [], linkedToThisParcel: false, isActive: false },
    ]);
  });
});

describe("distancesToParcelBoundary", () => {
  it("tanpa titik → [] tanpa kueri", async () => {
    expect(await q.distancesToParcelBoundary("lp-1", [])).toEqual([]);
    expect(db.$queryRaw).not.toHaveBeenCalled();
  });

  it("jarak dipetakan lewat ordinal i (1-based); d null / baris hilang → tak terhingga", async () => {
    db.$queryRaw.mockResolvedValue([
      { i: 3, d: "12.5" },
      { i: 1, d: 0 },
      { i: 2, d: null },
    ]);
    const pts = [{ lon: 1, lat: 1 }, { lon: 2, lat: 2 }, { lon: 3, lat: 3 }, { lon: 4, lat: 4 }];
    expect(await q.distancesToParcelBoundary("lp-1", pts)).toEqual([0, Infinity, 12.5, Infinity]);
  });

  it("lahan tanpa geometri (tak ada baris) → semua tak terhingga (ditolak guard)", async () => {
    db.$queryRaw.mockResolvedValue([]);
    expect(await q.distancesToParcelBoundary("lp-1", [{ lon: 1, lat: 1 }])).toEqual([Infinity]);
  });
});

describe("allocateMarkerCodes", () => {
  it("n kode berurutan diakhiri last_no yang dikembalikan counter", async () => {
    const tx = { $queryRaw: vi.fn().mockResolvedValue([{ last_no: 12 }]) };
    const codes = await q.allocateMarkerCodes(tx as never, "HJP", 3);
    expect(codes).toEqual([formatMarkerCode("HJP", 10), formatMarkerCode("HJP", 11), formatMarkerCode("HJP", 12)]);
    expect(codes[0]).toBe("HJP-PTK-000010");
  });

  it("counter baru (baris pertama) → mulai dari 1; n ≤ 0 → [] tanpa kueri", async () => {
    const tx = { $queryRaw: vi.fn().mockResolvedValue([{ last_no: "2" }]) };
    expect(await q.allocateMarkerCodes(tx as never, "ABC", 2)).toEqual(["ABC-PTK-000001", "ABC-PTK-000002"]);
    tx.$queryRaw.mockClear();
    expect(await q.allocateMarkerCodes(tx as never, "ABC", 0)).toEqual([]);
    expect(tx.$queryRaw).not.toHaveBeenCalled();
  });
});

describe("fetchFarmerGroupMarkerPoints / fetchFarmerMarkerPoints", () => {
  it("koordinat dinormalkan ke number, kolom lain apa adanya", async () => {
    db.$queryRaw.mockResolvedValue([{ id: "m1", code: "HJP-PTK-000001", longitude: "101.1", latitude: "0.5", condition: "PRESENT" }]);
    expect(await q.fetchFarmerGroupMarkerPoints("kt-1")).toEqual([
      { id: "m1", code: "HJP-PTK-000001", longitude: 101.1, latitude: 0.5, condition: "PRESENT" },
    ]);
    expect(await q.fetchFarmerMarkerPoints("f-1")).toHaveLength(1);
    expect(db.$queryRaw).toHaveBeenCalledTimes(2);
  });
});
