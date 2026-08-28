import { describe, it, expect } from "vitest";
import type { FeatureCollection, Feature } from "geojson";
import {
  confidenceBucket,
  processHotspots,
  countByConfidence,
  hotspotWindowLabel,
  hotspotAgeLabel,
} from "@/app/(admin)/admin/map/parcel/map-hotspot";
import {
  calcHotspotNearest,
  fileBase,
  hotspotRowCells,
} from "@/app/(admin)/admin/map/parcel/map-hotspot-export";
import type { KTPoint } from "@/types/map";

// "now" fixed at 2026-07-10 12:00 UTC for deterministic age buckets.
const NOW = Date.parse("2026-07-10T12:00:00Z");

function point(acqDatetime: string | null, confidence: string | null = "n"): Feature {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [101, 0.5] },
    properties: { acqDatetime, confidence },
  };
}

function fc(...features: Feature[]): FeatureCollection {
  return { type: "FeatureCollection", features };
}

describe("confidenceBucket", () => {
  it("maps VIIRS codes and spelled-out values", () => {
    expect(confidenceBucket("h")).toBe("high");
    expect(confidenceBucket("H")).toBe("high");
    expect(confidenceBucket("high")).toBe("high");
    expect(confidenceBucket("l")).toBe("low");
    expect(confidenceBucket("low")).toBe("low");
    expect(confidenceBucket("n")).toBe("nominal");
  });

  it("defaults unknown/missing values to nominal", () => {
    expect(confidenceBucket(null)).toBe("nominal");
    expect(confidenceBucket("")).toBe("nominal");
    expect(confidenceBucket("85")).toBe("nominal");
  });
});

describe("processHotspots", () => {
  it("tags age and confidence buckets for non-24-hour windows", () => {
    const out = processHotspots(
      fc(point("2026-07-10T04:00:00Z", "h"), point("2026-07-08T06:00:00Z", "l")),
      5,
      NOW
    );
    expect(out.features).toHaveLength(2);
    expect(out.features[0].properties).toMatchObject({ ageBucket: "recent", confBucket: "high" });
    expect(out.features[1].properties).toMatchObject({ ageBucket: "older", confBucket: "low" });
  });

  it("keeps only detections within the rolling last 24 h for the 24-hour window", () => {
    const out = processHotspots(
      fc(
        point("2026-07-10T04:00:00Z"), // 8 h ago → kept
        point("2026-07-09T13:00:00Z"), // 23 h ago, previous UTC day → kept
        point("2026-07-09T06:00:00Z"), // 30 h ago → dropped
        point(null) // unverifiable timestamp → dropped
      ),
      1,
      NOW
    );
    expect(out.features.map((f) => f.properties?.acqDatetime)).toEqual([
      "2026-07-10T04:00:00Z",
      "2026-07-09T13:00:00Z",
    ]);
    expect(out.features.every((f) => f.properties?.ageBucket === "recent")).toBe(true);
  });
});

describe("processHotspots — rentang 10/30 hari (#284)", () => {
  it("tidak memangkas apa pun: cakupan hari UTC ditentukan proxy, klien hanya menandai usia", () => {
    const old = point("2026-06-12T04:00:00Z"); // 28 hari lalu
    for (const d of [10, 30] as const) {
      const out = processHotspots(fc(point("2026-07-10T04:00:00Z"), old, point(null)), d, NOW);
      expect(out.features).toHaveLength(3);
      expect(out.features[1].properties?.ageBucket).toBe("older");
    }
  });
});

describe("hotspotWindowLabel / fileBase / hotspotAgeLabel", () => {
  const now = new Date("2026-08-24T07:00:00Z"); // 24 Agu 14.00 WIB

  it.each([
    [1, "24 jam", "titik-api-riau-24jam-20260824-1400"],
    [5, "5 hari", "titik-api-riau-5hari-20260824-1400"],
    [10, "10 hari", "titik-api-riau-10hari-20260824-1400"],
    [30, "30 hari", "titik-api-riau-30hari-20260824-1400"],
  ] as const)("rentang %i → label %s, nama berkas %s", (d, label, base) => {
    expect(hotspotWindowLabel(d)).toBe(label);
    expect(fileBase(d, now)).toBe(base);
  });

  it("usia deteksi dihitung saat data dimuat (ageDays), label murni dari properti itu", () => {
    const out = processHotspots(
      fc(
        point("2026-07-10T04:00:00Z"), // 8 jam → 0
        point("2026-07-09T11:00:00Z"), // 25 jam → 1
        point("2026-06-12T04:00:00Z"), // 28 hari → 28
        point(null)
      ),
      30,
      NOW
    );
    expect(out.features.map((f) => f.properties?.ageDays)).toEqual([0, 1, 28, null]);
    expect(out.features.map((f) => hotspotAgeLabel(f.properties?.ageDays))).toEqual([
      "< 24 jam",
      "1 hari lalu",
      "28 hari lalu",
      "—",
    ]);
    expect(hotspotAgeLabel("28")).toBe("—"); // bukan angka → tak menebak
  });
});

describe("countByConfidence", () => {
  it("counts processed points per bucket and handles null input", () => {
    const out = processHotspots(
      fc(point("2026-07-10T04:00:00Z", "h"), point("2026-07-10T04:00:00Z", "n"), point("2026-07-10T04:00:00Z", "l"), point("2026-07-10T04:00:00Z", "l")),
      5,
      NOW
    );
    expect(countByConfidence(out)).toEqual({ high: 1, nominal: 1, low: 2 });
    expect(countByConfidence(null)).toEqual({ high: 0, nominal: 0, low: 0 });
  });
});

describe("calcHotspotNearest — arah ke lembaga terdekat (#293)", () => {
  const kt = (name: string, long: number, lat: number): KTPoint => ({
    id: name,
    name,
    code: null,
    districtName: "Kampar",
    lat,
    long,
  });

  /** Satu titik api pada koordinat tertentu, satu lembaga di [101, 0]. */
  async function dirFor(lon: number, lat: number) {
    const feature: Feature = {
      type: "Feature",
      geometry: { type: "Point", coordinates: [lon, lat] },
      properties: { acqDatetime: "2026-07-10T05:00:00Z", confidence: "n" },
    };
    const rows = await calcHotspotNearest(fc(feature), [kt("Lembaga A", 101, 0)]);
    return hotspotRowCells(rows[0]).distanceDir;
  }

  // Penjaga risiko utama issue: bearing lembaga→titik dan titik→lembaga
  // berselisih 180°, dan bila terbalik angkanya tetap terlihat masuk akal.
  // Tak ada lint/build yang bisa menangkapnya — hanya tes semantik ini.
  it("labels a hotspot NORTH of the institution as U (utara)", async () => {
    expect(await dirFor(101, 0.2)).toContain("U 0°");
  });

  it("labels a hotspot EAST of the institution as T (timur)", async () => {
    expect(await dirFor(101.2, 0)).toContain("T 90°");
  });

  it("labels a hotspot SOUTH of the institution as S (selatan)", async () => {
    expect(await dirFor(101, -0.2)).toContain("S 180°");
  });

  it("labels a hotspot WEST of the institution as B (barat)", async () => {
    expect(await dirFor(100.8, 0)).toContain("B 270°");
  });

  it("keeps the distance alongside the direction", async () => {
    const cells = await dirFor(101, 0.2);
    expect(cells).toMatch(/^\d+,\d+ · U 0°$/);
  });

  it("returns an em dash when no institution is loaded", async () => {
    const feature: Feature = {
      type: "Feature",
      geometry: { type: "Point", coordinates: [101, 0.5] },
      properties: { acqDatetime: "2026-07-10T05:00:00Z", confidence: "n" },
    };
    const rows = await calcHotspotNearest(fc(feature), []);
    expect(hotspotRowCells(rows[0]).distanceDir).toBe("—");
  });
});
