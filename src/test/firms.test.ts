import { describe, it, expect } from "vitest";
import {
  parseBbox,
  acqDatetime,
  isFirmsCsv,
  csvToGeoJSON,
  upstreamWindows,
  utcMidnightDaysAgo,
  mergeHotspotCollections,
  parseDataAvailability,
  parseHotspotMonth,
  monthWindows,
  HOTSPOT_DAY_RANGES,
  HOTSPOT_MONTH_MIN,
  FIRMS_SOURCES,
  utcMonth,
  type FirmsAvailability,
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

  it("5 hari = satu jendela ber-DATE H-4 (URL sama dengan jendela terbaru 10/30 → cache bersama)", () => {
    expect(upstreamWindows(5, now)).toEqual([{ dayRange: 5, date: "2026-08-20" }]);
  });

  it("10 hari = dua jendela ber-DATE: H-9 dan H-4 (UTC)", () => {
    expect(upstreamWindows(10, now)).toEqual([
      { dayRange: 5, date: "2026-08-15" },
      { dayRange: 5, date: "2026-08-20" },
    ]);
  });

  it("30 hari = 6 jendela 5 hari berurutan tanpa celah/tumpang tindih, dari H-29", () => {
    expect(upstreamWindows(30, now)).toEqual([
      { dayRange: 5, date: "2026-07-26" },
      { dayRange: 5, date: "2026-07-31" },
      { dayRange: 5, date: "2026-08-05" },
      { dayRange: 5, date: "2026-08-10" },
      { dayRange: 5, date: "2026-08-15" },
      { dayRange: 5, date: "2026-08-20" },
    ]);
  });

  it("jendela terbaru pun ber-DATE — cakupan tidak bergantung 'hari ini' versi FIRMS (#285)", () => {
    for (const d of [5, 10, 30]) {
      expect(upstreamWindows(d, now)!.every((w) => typeof w.date === "string")).toBe(true);
    }
  });

  it("properti: gabungan jendela = tepat [H-(N-1) … H] tanpa celah, semua rentang ≥5 kelipatan 5", () => {
    const DAY = 24 * 60 * 60 * 1000;
    for (const n of HOTSPOT_DAY_RANGES.filter((d) => d >= 5)) {
      expect(n % 5).toBe(0);
      const windows = upstreamWindows(n, now)!;
      const covered = new Set<string>();
      for (const w of windows) {
        const start = Date.parse(`${w.date}T00:00:00Z`);
        for (let i = 0; i < w.dayRange; i++) {
          covered.add(new Date(start + i * DAY).toISOString().slice(0, 10));
        }
      }
      const expected = new Set<string>();
      for (let back = n - 1; back >= 0; back--) {
        expected.add(utcMidnightDaysAgo(now, back).toISOString().slice(0, 10));
      }
      expect(covered).toEqual(expected);
      // Tanpa tumpang tindih: total hari jendela = N.
      expect(windows.reduce((s, w) => s + w.dayRange, 0)).toBe(n);
    }
  });

  it("DATE dihitung dari tanggal UTC, bukan WIB — 00.00–07.00 WIB masih hari kemarin", () => {
    // 25 Agu 05.00 WIB = 24 Agu 22.00 UTC → hari ini (UTC) masih 24 Agu.
    expect(upstreamWindows(10, new Date("2026-08-24T22:00:00Z"))).toEqual([
      { dayRange: 5, date: "2026-08-15" },
      { dayRange: 5, date: "2026-08-20" },
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

describe("parseDataAvailability (#365)", () => {
  const CSV = [
    "data_id,min_date,max_date",
    "MODIS_NRT,2026-07-01,2026-09-22",
    "VIIRS_SNPP_NRT,2026-07-01,2026-09-22",
    "VIIRS_SNPP_SP,2012-01-20,2026-06-30",
    "VIIRS_NOAA20_NRT,2026-07-01,2026-09-22",
  ].join("\n");

  it("mengambil hanya SP & NRT VIIRS SNPP dari daftar ALL", () => {
    expect(parseDataAvailability(CSV)).toEqual({
      sp: { min: "2012-01-20", max: "2026-06-30" },
      nrt: { min: "2026-07-01", max: "2026-09-22" },
    });
  });

  it("teks error (bukan CSV) atau header tak dikenal → kedua sumber null", () => {
    expect(parseDataAvailability("Invalid MAP_KEY.")).toEqual({ sp: null, nrt: null });
    expect(parseDataAvailability("source,from,to\nVIIRS_SNPP_SP,2012-01-20,2026-06-30")).toEqual({
      sp: null,
      nrt: null,
    });
  });

  it("baris bertanggal rusak atau terbalik dilewati, sumber lain tetap terbaca", () => {
    const csv =
      "data_id,min_date,max_date\nVIIRS_SNPP_SP,2012/01/20,2026-06-30\nVIIRS_SNPP_NRT,2026-09-22,2026-07-01\nVIIRS_SNPP_NRT,2026-07-01,2026-09-22";
    expect(parseDataAvailability(csv)).toEqual({
      sp: null,
      nrt: { min: "2026-07-01", max: "2026-09-22" },
    });
  });
});

describe("parseHotspotMonth (#365)", () => {
  const now = new Date("2026-09-22T10:00:00Z");

  it("menerima YYYY-MM dari batas bawah sampai bulan berjalan (UTC)", () => {
    expect(parseHotspotMonth(HOTSPOT_MONTH_MIN, now)).toBe("2020-01");
    expect(parseHotspotMonth("2025-01", now)).toBe("2025-01");
    expect(parseHotspotMonth("2026-09", now)).toBe("2026-09");
  });

  it("menolak bulan depan, sebelum batas bawah, bulan 00/13, dan bentuk longgar", () => {
    for (const raw of ["2026-10", "2019-12", "2026-00", "2026-13", "2026-9", "2026-09-01", " 2026-09", "abc", "", null]) {
      expect(parseHotspotMonth(raw, now), `month=${JSON.stringify(raw)}`).toBeNull();
    }
  });

  it("utcMonth: bulan UTC + offset, melintasi tahun", () => {
    expect(utcMonth(now)).toBe("2026-09");
    expect(utcMonth(now, -1)).toBe("2026-08");
    expect(utcMonth(new Date("2026-01-15T00:00:00Z"), -1)).toBe("2025-12");
    // 1 Okt 05.00 WIB = 30 Sep 22.00 UTC → masih September.
    expect(utcMonth(new Date("2026-09-30T22:00:00Z"))).toBe("2026-09");
  });

  it("bulan berjalan dihitung UTC — 1 Okt 05.00 WIB masih September", () => {
    expect(parseHotspotMonth("2026-10", new Date("2026-09-30T22:00:00Z"))).toBeNull();
    expect(parseHotspotMonth("2026-09", new Date("2026-09-30T22:00:00Z"))).toBe("2026-09");
  });
});

describe("monthWindows (#365)", () => {
  const now = new Date("2026-09-22T10:00:00Z");
  const avail: FirmsAvailability = {
    sp: { min: "2012-01-20", max: "2026-06-30" },
    nrt: { min: "2026-07-01", max: "2026-09-22" },
  };
  const SP = FIRMS_SOURCES.sp;
  const NRT = FIRMS_SOURCES.nrt;

  it("bulan lampau di arsip: 31 hari = 7 jendela SP dari tanggal 1 (6×5 + 1), tanpa celah", () => {
    const plan = monthWindows("2025-01", now, avail)!;
    expect(plan.from).toBe("2025-01-01");
    expect(plan.to).toBe("2025-01-31");
    expect(plan.missingDates).toEqual([]);
    expect(plan.windows).toEqual([
      { dayRange: 5, date: "2025-01-01", source: SP },
      { dayRange: 5, date: "2025-01-06", source: SP },
      { dayRange: 5, date: "2025-01-11", source: SP },
      { dayRange: 5, date: "2025-01-16", source: SP },
      { dayRange: 5, date: "2025-01-21", source: SP },
      { dayRange: 5, date: "2025-01-26", source: SP },
      { dayRange: 1, date: "2025-01-31", source: SP },
    ]);
  });

  it("panjang bulan: Feb 2024 (kabisat) 29 hari → jendela terakhir 3 hari; Apr 30 hari → 6 jendela penuh", () => {
    const feb = monthWindows("2024-02", now, avail)!;
    expect(feb.to).toBe("2024-02-29");
    expect(feb.windows.at(-1)).toEqual({ dayRange: 4, date: "2024-02-26", source: SP });
    const apr = monthWindows("2025-04", now, avail)!;
    expect(apr.windows).toHaveLength(6);
    expect(apr.windows.reduce((s, w) => s + w.dayRange, 0)).toBe(30);
  });

  it("bulan berjalan dipangkas ke hari ini (UTC) dan dilayani NRT", () => {
    const plan = monthWindows("2026-09", now, avail)!;
    expect(plan.to).toBe("2026-09-22");
    expect(plan.windows).toEqual([
      { dayRange: 5, date: "2026-09-01", source: NRT },
      { dayRange: 5, date: "2026-09-06", source: NRT },
      { dayRange: 5, date: "2026-09-11", source: NRT },
      { dayRange: 5, date: "2026-09-16", source: NRT },
      { dayRange: 2, date: "2026-09-21", source: NRT },
    ]);
    expect(plan.missingDates).toEqual([]);
  });

  it("NRT dianggap terbuka sampai hari ini walau max_date yang dicache tertinggal", () => {
    const stale = { ...avail, nrt: { min: "2026-07-01", max: "2026-09-20" } };
    const plan = monthWindows("2026-09", now, stale)!;
    expect(plan.missingDates).toEqual([]);
    expect(plan.windows.at(-1)).toEqual({ dayRange: 2, date: "2026-09-21", source: NRT });
  });

  it("SP diutamakan bila kedua sumber menyimpan tanggal yang sama (overlap)", () => {
    const overlap = { ...avail, sp: { min: "2012-01-20", max: "2026-07-15" } };
    const plan = monthWindows("2026-07", now, overlap)!;
    expect(plan.windows.map((w) => w.source)).toEqual([SP, SP, SP, NRT, NRT, NRT, NRT]);
    expect(plan.windows[2]).toEqual({ dayRange: 5, date: "2026-07-11", source: SP });
    // Jendela NRT dimulai tepat setelah SP berakhir, dikelompokkan 5 hari dari situ.
    expect(plan.windows[3]).toEqual({ dayRange: 5, date: "2026-07-16", source: NRT });
    expect(plan.windows.at(-1)).toEqual({ dayRange: 1, date: "2026-07-31", source: NRT });
  });

  it("celah SP tertinggal & NRT sudah lewat → tanggal masuk missingDates, jendela di kedua sisi tetap utuh", () => {
    const gap = {
      sp: { min: "2012-01-20", max: "2026-07-03" },
      nrt: { min: "2026-07-07", max: "2026-09-22" },
    };
    const plan = monthWindows("2026-07", now, gap)!;
    expect(plan.missingDates).toEqual(["2026-07-04", "2026-07-05", "2026-07-06"]);
    expect(plan.windows[0]).toEqual({ dayRange: 3, date: "2026-07-01", source: SP });
    expect(plan.windows[1]).toEqual({ dayRange: 5, date: "2026-07-07", source: NRT });
    // Semua hari tercakup: jendela + celah = 31.
    expect(plan.windows.reduce((s, w) => s + w.dayRange, 0) + plan.missingDates.length).toBe(31);
  });

  it("sumber yang tidak dilaporkan FIRMS (null) tidak dipakai", () => {
    const plan = monthWindows("2025-01", now, { sp: null, nrt: avail.nrt })!;
    expect(plan.windows).toEqual([]);
    expect(plan.missingDates).toHaveLength(31);
  });

  it("bulan tak valid → null (validasi sama dengan parseHotspotMonth)", () => {
    expect(monthWindows("2026-10", now, avail)).toBeNull();
    expect(monthWindows("2019-12", now, avail)).toBeNull();
  });

  it("properti: jendela tak pernah >5 hari, berurutan tanpa tumpang tindih, urut tanggal", () => {
    const DAY = 24 * 60 * 60 * 1000;
    for (const [month, a] of [
      ["2025-01", avail],
      ["2026-07", { sp: { min: "2012-01-20", max: "2026-07-13" }, nrt: { min: "2026-07-16", max: "2026-09-22" } }],
      ["2026-09", avail],
    ] as const) {
      const plan = monthWindows(month, now, a)!;
      let prevEnd = 0;
      for (const w of plan.windows) {
        expect(w.dayRange).toBeGreaterThanOrEqual(1);
        expect(w.dayRange).toBeLessThanOrEqual(5);
        const start = Date.parse(`${w.date}T00:00:00Z`);
        expect(start).toBeGreaterThan(prevEnd);
        prevEnd = start + (w.dayRange - 1) * DAY;
      }
    }
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
    // Satelit berbeda pada koordinat & waktu yang sama = deteksi berbeda — tanpa dedup jadi 3.
    expect(merged.features.map((f) => f.properties?.satellite)).toEqual(["N", "1"]);
  });

  it("pada tabrakan, salinan dari jendela terakhir (lebih baru) yang dipakai, posisi tetap", () => {
    const older = { ...pt(101, 0.5, "2026-08-19"), properties: { acqDate: "2026-08-19", acqTime: "633", satellite: "N", frp: 1 } };
    const newer = { ...older, properties: { ...older.properties, frp: 9 } };
    const merged = mergeHotspotCollections([fc(older, pt(102, 0.6, "2026-08-20")), fc(newer)]);
    expect(merged.features.map((f) => f.properties?.frp ?? null)).toEqual([9, null]);
  });

  it("fitur non-Point diteruskan apa adanya, tidak saling menelan", () => {
    const line = (id: number): Feature => ({
      type: "Feature",
      geometry: { type: "LineString", coordinates: [[101, 0], [102, 0]] },
      properties: { id },
    });
    const merged = mergeHotspotCollections([fc(line(1)), fc(line(2))]);
    expect(merged.features.map((f) => f.properties?.id)).toEqual([1, 2]);
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
