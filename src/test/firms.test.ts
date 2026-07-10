import { describe, it, expect } from "vitest";
import { parseBbox, acqDatetime, isFirmsCsv, csvToGeoJSON } from "@/lib/firms";

const HEADER =
  "latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight";

describe("parseBbox", () => {
  it("accepts a valid west,south,east,north bbox", () => {
    expect(parseBbox("100,-1.4,104.7,3")).toBe("100,-1.4,104.7,3");
  });

  it("rejects wrong arity, non-numeric, or out-of-range values", () => {
    expect(parseBbox(null)).toBeNull();
    expect(parseBbox("100,-1.4,104.7")).toBeNull();
    expect(parseBbox("abc")).toBeNull();
    expect(parseBbox("100,-1.4,x,3")).toBeNull();
    expect(parseBbox("-200,-1,10,3")).toBeNull(); // west < -180
    expect(parseBbox("10,-1,200,3")).toBeNull(); // east > 180
    expect(parseBbox("10,-100,20,3")).toBeNull(); // south < -90
  });

  it("rejects degenerate/inverted extents", () => {
    expect(parseBbox("104,-1,100,3")).toBeNull(); // west >= east
    expect(parseBbox("100,3,104,-1")).toBeNull(); // south >= north
    expect(parseBbox("100,1,100,3")).toBeNull(); // zero width
  });
});

describe("acqDatetime", () => {
  it("pads acq_time and builds a UTC ISO timestamp", () => {
    expect(acqDatetime("2026-07-10", "1")).toBe("2026-07-10T00:01:00Z");
    expect(acqDatetime("2026-07-10", "133")).toBe("2026-07-10T01:33:00Z");
    expect(acqDatetime("2026-07-10", "1204")).toBe("2026-07-10T12:04:00Z");
  });

  it("returns null for a malformed date", () => {
    expect(acqDatetime("10-07-2026", "1204")).toBeNull();
    expect(acqDatetime("", "1")).toBeNull();
  });
});

describe("isFirmsCsv", () => {
  it("recognizes CSV headers and rejects error pages", () => {
    expect(isFirmsCsv(HEADER)).toBe(true);
    expect(isFirmsCsv("country_id,latitude")).toBe(true);
    expect(isFirmsCsv("Invalid day range. Expects [1..5].")).toBe(false);
    expect(isFirmsCsv("<html>error</html>")).toBe(false);
  });
});

describe("csvToGeoJSON", () => {
  it("returns an empty FeatureCollection for header-only input", () => {
    const fc = csvToGeoJSON(HEADER);
    expect(fc.type).toBe("FeatureCollection");
    expect(fc.features).toHaveLength(0);
  });

  it("parses rows into point features with typed properties", () => {
    const csv = `${HEADER}\n8.39267,32.89442,301.01,0.59,0.53,2026-07-10,1,N,VIIRS,n,2.0NRT,256.76,3.61,N`;
    const fc = csvToGeoJSON(csv);
    expect(fc.features).toHaveLength(1);
    const f = fc.features[0];
    // GeoJSON order is [lng, lat].
    expect(f.geometry).toEqual({ type: "Point", coordinates: [32.89442, 8.39267] });
    expect(f.properties).toMatchObject({
      acqDate: "2026-07-10",
      acqDatetime: "2026-07-10T00:01:00Z",
      satellite: "N",
      confidence: "n",
      frp: 3.61,
      brightness: 301.01,
      daynight: "N",
    });
  });

  it("skips rows with non-numeric coordinates", () => {
    const csv = `${HEADER}\nx,y,1,1,1,2026-07-10,1,N,VIIRS,n,2,1,1,N`;
    expect(csvToGeoJSON(csv).features).toHaveLength(0);
  });
});
