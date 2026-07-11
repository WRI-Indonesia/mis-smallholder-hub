import { describe, it, expect } from "vitest";
import { buildMapData, monthlyAverageYield, summarizeProduction, type RawGroup, type RawParcel } from "@/lib/map-data";

const group = (over: Partial<RawGroup> = {}): RawGroup => ({
  id: "g1",
  name: "KT Maju",
  code: "KT-01",
  locationLat: 0.5,
  locationLong: 101.4,
  district: { name: "Kampar" },
  ...over,
});

// A simple square polygon centered at (100, 0).
const square: RawParcel["geometry"] = {
  type: "Polygon",
  coordinates: [
    [
      [99.5, -0.5],
      [100.5, -0.5],
      [100.5, 0.5],
      [99.5, 0.5],
      [99.5, -0.5],
    ],
  ],
};

const parcel = (over: Partial<RawParcel> = {}): RawParcel => ({
  id: "p1",
  parcelId: "PCL-01",
  farmerId: "f1",
  geometry: square,
  area: 2.5,
  plantingYear: 2020,
  cropType: "Kelapa Sawit",
  landStatus: "Milik",
  farmer: { name: "Budi", farmerId: "FMR-01", farmerGroup: { name: "KT Maju" } },
  ...over,
});

describe("buildMapData", () => {
  it("builds KT points and parcel features with derived centroid", () => {
    const result = buildMapData([group()], [parcel()]);

    expect(result.kelompokTani).toHaveLength(1);
    expect(result.kelompokTani[0]).toMatchObject({
      id: "g1",
      name: "KT Maju",
      districtName: "Kampar",
      lat: 0.5,
      long: 101.4,
    });

    expect(result.parcels).toHaveLength(1);
    const [long, lat] = result.parcels[0].centroid;
    expect(long).toBeCloseTo(100, 5);
    expect(lat).toBeCloseTo(0, 5);
    expect(result.parcels[0]).toMatchObject({
      parcelId: "PCL-01",
      farmerName: "Budi",
      farmerGroupName: "KT Maju",
      area: 2.5,
    });
  });

  it("excludes KT without coordinates from the kt layer", () => {
    const result = buildMapData(
      [group(), group({ id: "g2", locationLat: null }), group({ id: "g3", locationLong: null })],
      []
    );
    expect(result.kelompokTani.map((k) => k.id)).toEqual(["g1"]);
    expect(result.counts.kt).toBe(1);
  });

  it("skips parcels with null geometry", () => {
    const result = buildMapData([], [parcel(), parcel({ id: "p2", geometry: null })]);
    expect(result.parcels.map((p) => p.id)).toEqual(["p1"]);
    expect(result.counts.parcelPoints).toBe(1);
  });

  it("skips parcels with invalid geometry without failing the batch", () => {
    const result = buildMapData(
      [],
      [parcel(), parcel({ id: "p2", geometry: { type: "Polygon", coordinates: "broken" } as never })]
    );
    expect(result.parcels.map((p) => p.id)).toEqual(["p1"]);
  });

  it("falls back to em dash for missing farmer / group / district", () => {
    const result = buildMapData(
      [group({ district: null })],
      [parcel({ farmer: null })]
    );
    expect(result.kelompokTani[0].districtName).toBe("—");
    expect(result.parcels[0].farmerName).toBe("—");
    expect(result.parcels[0].farmerGroupName).toBe("—");
  });

  it("reports counts consistent with produced features", () => {
    const result = buildMapData(
      [group(), group({ id: "g2" })],
      [parcel(), parcel({ id: "p2" }), parcel({ id: "p3" })]
    );
    expect(result.counts).toEqual({ kt: 2, parcelPoints: 3, parcelAreas: 3 });
  });

  it("returns empty payload for empty input", () => {
    const result = buildMapData([], []);
    expect(result.kelompokTani).toEqual([]);
    expect(result.parcels).toEqual([]);
    expect(result.counts).toEqual({ kt: 0, parcelPoints: 0, parcelAreas: 0 });
  });
});

describe("monthlyAverageYield", () => {
  it("returns 12 zeros for no records", () => {
    const result = monthlyAverageYield([]);
    expect(result).toHaveLength(12);
    expect(result.every((v) => v === 0)).toBe(true);
  });

  it("sums records within the same period, then places them by calendar month", () => {
    const result = monthlyAverageYield([
      { period: "2025-03", yieldKg: 100 },
      { period: "2025-03", yieldKg: 50 },
    ]);
    expect(result[2]).toBe(150); // March index 2
    expect(result[0]).toBe(0);
  });

  it("averages the same calendar month across multiple years", () => {
    const result = monthlyAverageYield([
      { period: "2024-06", yieldKg: 200 },
      { period: "2025-06", yieldKg: 100 },
    ]);
    expect(result[5]).toBe(150); // (200 + 100) / 2 years
  });

  it("ignores malformed periods gracefully", () => {
    const result = monthlyAverageYield([{ period: "bad", yieldKg: 999 }]);
    expect(result.every((v) => v === 0)).toBe(true);
  });
});

describe("summarizeProduction", () => {
  it("returns empty breakdown for no records", () => {
    const result = summarizeProduction([]);
    expect(result.byYear).toEqual([]);
    expect(result.monthly).toHaveLength(12);
    expect(result.totalKg).toBe(0);
    expect(result.recordCount).toBe(0);
  });

  it("groups yield per year and month, sorts years descending, and totals each year", () => {
    const result = summarizeProduction([
      { period: "2024-06", yieldKg: 200 },
      { period: "2025-06", yieldKg: 100 },
      { period: "2025-06", yieldKg: 50 }, // same period → summed
      { period: "2025-01", yieldKg: 30 },
    ]);
    expect(result.byYear.map((y) => y.year)).toEqual([2025, 2024]);
    const y2025 = result.byYear[0];
    expect(y2025.monthly[5]).toBe(150); // June 2025 = 100 + 50
    expect(y2025.monthly[0]).toBe(30); // January 2025
    expect(y2025.total).toBe(180);
    expect(result.byYear[1].monthly[5]).toBe(200); // June 2024
    expect(result.totalKg).toBe(380);
    expect(result.recordCount).toBe(4);
  });

  it("keeps monthly as the cross-year average (same as monthlyAverageYield)", () => {
    const records = [
      { period: "2024-06", yieldKg: 200 },
      { period: "2025-06", yieldKg: 100 },
    ];
    expect(summarizeProduction(records).monthly).toEqual(monthlyAverageYield(records));
  });

  it("ignores malformed periods but still counts them in recordCount/totalKg", () => {
    const result = summarizeProduction([{ period: "bad", yieldKg: 999 }]);
    expect(result.byYear).toEqual([]);
    expect(result.recordCount).toBe(1);
    expect(result.totalKg).toBe(999);
  });
});
