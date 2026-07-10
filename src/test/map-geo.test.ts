import { describe, it, expect } from "vitest";
import {
  haversineMeters,
  pathMeters,
  sphericalAreaM2,
  formatDistance,
  formatMeasureArea,
  geomBounds,
  parcelLabelFit,
  type LngLat,
} from "@/app/(admin)/admin/map/parcel/map-geo";

describe("haversineMeters", () => {
  it("is zero for identical points", () => {
    expect(haversineMeters([101, 0], [101, 0])).toBe(0);
  });

  it("matches ~1 degree of latitude ≈ 111 km", () => {
    const d = haversineMeters([101, 0], [101, 1]);
    expect(d).toBeGreaterThan(110_000);
    expect(d).toBeLessThan(112_000);
  });

  it("is symmetric", () => {
    const a: LngLat = [101.1, 0.3];
    const b: LngLat = [101.9, 0.8];
    expect(haversineMeters(a, b)).toBeCloseTo(haversineMeters(b, a), 6);
  });
});

describe("pathMeters", () => {
  it("sums consecutive segments", () => {
    const pts: LngLat[] = [[101, 0], [101, 1], [101, 2]];
    expect(pathMeters(pts)).toBeCloseTo(haversineMeters([101, 0], [101, 1]) * 2, 3);
  });

  it("is zero for fewer than two points", () => {
    expect(pathMeters([])).toBe(0);
    expect(pathMeters([[101, 0]])).toBe(0);
  });
});

describe("sphericalAreaM2", () => {
  it("is zero below three points", () => {
    expect(sphericalAreaM2([[101, 0], [101, 1]])).toBe(0);
  });

  it("approximates a 1°×1° box area near the equator", () => {
    const box: LngLat[] = [[101, 0], [102, 0], [102, 1], [101, 1]];
    const area = sphericalAreaM2(box);
    // ~111km × ~111km ≈ 1.23e10 m²; allow generous tolerance.
    expect(area).toBeGreaterThan(1.1e10);
    expect(area).toBeLessThan(1.4e10);
  });
});

describe("formatDistance", () => {
  it("uses meters below 1 km and km above", () => {
    expect(formatDistance(950)).toBe("950 m");
    expect(formatDistance(1500)).toContain("km");
  });
});

describe("formatMeasureArea", () => {
  it("scales m² → ha → km²", () => {
    expect(formatMeasureArea(500)).toContain("m²");
    expect(formatMeasureArea(50_000)).toContain("ha");
    expect(formatMeasureArea(5_000_000)).toContain("km²");
  });
});

describe("geomBounds", () => {
  it("computes bounds for a polygon", () => {
    const geometry = {
      type: "Polygon",
      coordinates: [[[100, -1], [102, -1], [102, 1], [100, 1], [100, -1]]],
    };
    expect(geomBounds(geometry)).toEqual([100, -1, 102, 1]);
  });

  it("returns null for input without coordinates", () => {
    expect(geomBounds(null)).toBeNull();
    expect(geomBounds({ type: "Point" })).toBeNull();
  });
});

describe("parcelLabelFit", () => {
  // A ~2° wide box at the equator is huge on screen at high zoom → label fits.
  const bigBox: [number, number, number, number] = [100, -1, 102, 1];

  it("fits a short name in a large polygon at high zoom", () => {
    const fit = parcelLabelFit("Budi", bigBox, 14);
    expect(fit).not.toBeNull();
    expect(fit!.maxWidthEms).toBeGreaterThan(0);
  });

  it("hides the label when the polygon is tiny on screen (low zoom)", () => {
    const tinyBox: [number, number, number, number] = [101.0, 0.0, 101.0005, 0.0005];
    expect(parcelLabelFit("Budi Santoso", tinyBox, 8)).toBeNull();
  });
});
