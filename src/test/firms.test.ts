import { describe, it, expect } from "vitest";
import {
  parseBbox,
  acqDatetime,
  isFirmsCsv,
  csvToGeoJSON,
  upstreamWindows,
  utcMidnightDaysAgo,
  mergeHotspotCollections,
} from "@/lib/firms";
import type { Feature } from "geojson";

const HEADER =
  "latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight";

describe("upstreamWindows (#284)", () => {
  const now = new Date("2026-08-24T10:00:00Z");

  it("24 jam mengambil 2 hari UTC tanpa DATE; nilai lama 2 diterima", () => {
    expect(upstreamWindows(1, now)).toEqual([{ dayRange: 2 }]);
    expect(upstreamWindows(2, now)).toEqual([{ dayRange: 2 }]);
  });

  it("5 hari = satu jendela tanpa DATE (URL sama dengan sebelumnya → cache bersama)", () => {
    expect(upstreamWindows(5, now)).toEqual([{ dayRange: 5 }]);
  });

  it("10 hari = jendela ber-DATE mulai H-9 (UTC) + jendela terbaru tanpa DATE", () => {
    expect(upstreamWindows(10, now)).toEqual([{ dayRange: 5, date: "2026-08-15" }, { dayRange: 5 }]);
  });

  it("30 hari = 6 jendela 5 hari berurutan tanpa celah/tumpang tindih, dari H-29", () => {
    expect(upstreamWindows(30, now)).toEqual([
      { dayRange: 5, date: "2026-07-26" },
      { dayRange: 5, date: "2026-07-31" },
      { dayRange: 5, date: "2026-08-05" },
      { dayRange: 5, date: "2026-08-10" },
      { dayRange: 5, date: "2026-08-15" },
      { dayRange: 5 },
    ]);
  });

  it("DATE dihitung dari tanggal UTC, bukan WIB — 00.00–07.00 WIB masih hari kemarin", () => {
    // 25 Agu 05.00 WIB = 24 Agu 22.00 UTC → hari ini (FIRMS) masih 24 Agu.
    expect(upstreamWindows(10, new Date("2026-08-24T22:00:00Z"))).toEqual([
      { dayRange: 5, date: "2026-08-15" },
      { dayRange: 5 },
    ]);
  });

  it("melintasi batas bulan/tahun dengan benar", () => {
    expect(upstreamWindows(10, new Date("2027-01-03T00:00:00Z"))![0]).toEqual({
      dayRange: 5,
      date: "2026-12-25",
    });
  });

  it("menolak nilai di luar kontrak", () => {
    for (const d of [0, 3, 6, 7, 15, 31, NaN]) expect(upstreamWindows(d, now)).toBeNull();
  });

  it("utcMidnightDaysAgo: 0 = 00.00 UTC hari ini", () => {
    expect(utcMidnightDaysAgo(now, 0).toISOString()).toBe("2026-08-24T00:00:00.000Z");
    expect(utcMidnightDaysAgo(now, 29).toISOString()).toBe("2026-07-26T00:00:00.000Z");
  });
});

describe("mergeHotspotCollections (#284)", () => {
  const pt = (lon: number, lat: number, acqDate: string, acqTime = "633", satellite = "N"): Feature => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [lon, lat] },
    properties: { acqDate, acqTime, satellite },
  });
  const fc = (...features: Feature[]) => ({ type: "FeatureCollection" as const, features });

  it("menggabungkan jendela dengan urutan dipertahankan", () => {
    const merged = mergeHotspotCollections([fc(pt(101, 0.5, "2026-08-15")), fc(pt(102, 0.6, "2026-08-20"))]);
    expect(merged.features.map((f) => f.properties?.acqDate)).toEqual(["2026-08-15", "2026-08-20"]);
  });

  it("deteksi identik (koordinat + waktu + satelit) di dua jendela hanya masuk sekali", () => {
    const dup = pt(101, 0.5, "2026-08-19");
    const merged = mergeHotspotCollections([fc(dup), fc(dup, pt(101, 0.5, "2026-08-19", "633", "1"))]);
    // Satelit berbeda pada koordinat & waktu yang sama = deteksi berbeda.
    expect(merged.features).toHaveLength(2);
  });

  it("daftar kosong → FeatureCollection kosong", () => {
    expect(mergeHotspotCollections([]).features).toHaveLength(0);
  });
});

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
