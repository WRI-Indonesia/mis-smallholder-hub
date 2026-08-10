import { describe, it, expect } from "vitest";
import type { FeatureCollection, Feature } from "geojson";
import {
  confidenceBucket,
  processHotspots,
  countByConfidence,
} from "@/app/(admin)/admin/map/parcel/map-hotspot";

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
  it("tags age and confidence buckets for the 5-day window", () => {
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
