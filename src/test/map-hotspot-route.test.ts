import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Integration test route GET /api/map-hotspot (#231): guard permission,
// validasi param, jalur sukses & gagal upstream. Fetch NASA FIRMS di-mock di
// level global — tidak ada panggilan jaringan sungguhan.
const hasPermission = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rbac", () => ({ hasPermission }));

const { GET } = await import("@/app/api/map-hotspot/route");

const CSV_HEADER =
  "latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight";
const CSV_OK = `${CSV_HEADER}\n0.5,101.2,301.01,0.59,0.53,2026-08-08,633,N,VIIRS,n,2.0NRT,290.1,3.6,D`;

const TEST_KEY = "test-firms-key-123";
const VALID_QS = "bbox=100,-1.4,104.7,3&dayRange=2";
const req = (qs: string) => new NextRequest(`http://localhost/api/map-hotspot?${qs}`);

const fetchMock = vi.fn();

beforeEach(() => {
  hasPermission.mockReset().mockResolvedValue(true);
  // Response baru per panggilan — body sebuah Response hanya bisa dibaca sekali.
  fetchMock.mockReset().mockImplementation(async () => new Response(CSV_OK, { status: 200 }));
  vi.stubEnv("FIRMS_MAP_KEY_FREE", TEST_KEY);
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("GET /api/map-hotspot — guard & konfigurasi", () => {
  it("403 tanpa permission map-parcel maupun dashboard-risk-fire VIEW, tanpa menyentuh upstream", async () => {
    hasPermission.mockResolvedValue(false);
    const res = await GET(req(VALID_QS));
    expect(res.status).toBe(403);
    expect(hasPermission).toHaveBeenCalledWith("map-parcel", "VIEW");
    expect(hasPermission).toHaveBeenCalledWith("dashboard-risk-fire", "VIEW");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("izin dashboard-risk-fire VIEW saja sudah cukup (Dashboard Fire Alert #266)", async () => {
    hasPermission.mockImplementation(async (key: string) => key === "dashboard-risk-fire");
    const res = await GET(req(VALID_QS));
    expect(res.status).toBe(200);
  });

  it("500 bila FIRMS_MAP_KEY_FREE tidak dikonfigurasi", async () => {
    vi.stubEnv("FIRMS_MAP_KEY_FREE", "");
    const res = await GET(req(VALID_QS));
    expect(res.status).toBe(500);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("GET /api/map-hotspot — validasi parameter", () => {
  it("400 untuk bbox hilang/rusak/di luar jangkauan", async () => {
    for (const qs of [
      "dayRange=2",
      "bbox=abc&dayRange=2",
      "bbox=100,-1.4,104.7&dayRange=2",
      "bbox=104,-1.4,100,3&dayRange=2", // west >= east
    ]) {
      const res = await GET(req(qs));
      expect(res.status).toBe(400);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("400 untuk dayRange di luar {1, 2, 5, 10, 30} — termasuk bentuk numerik non-desimal", async () => {
    // "1e1"/"0x1E"/"10.0"/" 5 " bernilai sama lewat Number(), tapi bukan kontrak.
    for (const d of ["", "3", "6", "15", "31", "abc", "1e1", "0x1E", "10.0", " 5 ", "-5"]) {
      const res = await GET(req(`bbox=100,-1.4,104.7,3&dayRange=${encodeURIComponent(d)}`));
      expect(res.status, `dayRange=${JSON.stringify(d)}`).toBe(400);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("menerima dayRange 2 dan 5, serta 1 (kontrak lama) yang dipetakan ke 2 hari upstream", async () => {
    for (const [d, upstream] of [
      ["2", /\/2$/],
      ["5", /\/5\/\d{4}-\d{2}-\d{2}$/], // 5 hari pun ber-DATE (#285)
      ["1", /\/2$/], // bundle pra-deploy masih mengirim 1 — jangan 400
    ] as const) {
      fetchMock.mockClear();
      const res = await GET(req(`bbox=100,-1.4,104.7,3&dayRange=${d}`));
      expect(res.status).toBe(200);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(String(fetchMock.mock.calls[0][0])).toMatch(upstream);
    }
  });
});

describe("GET /api/map-hotspot — rentang 10 & 30 hari dari beberapa jendela FIRMS (#284)", () => {
  beforeEach(() => {
    // Hanya Date yang dibekukan — setTimeout (timeout upstream) tetap nyata.
    vi.useFakeTimers({ now: new Date("2026-08-24T10:00:00Z"), toFake: ["Date"] });
  });
  afterEach(() => vi.useRealTimers());

  const base = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${TEST_KEY}/VIIRS_SNPP_NRT/100,-1.4,104.7,3`;

  it("10 hari = 2 request ber-DATE: H-9 dan H-4 (UTC)", async () => {
    const res = await GET(req("bbox=100,-1.4,104.7,3&dayRange=10"));
    expect(res.status).toBe(200);
    expect(fetchMock.mock.calls.map((c) => String(c[0]))).toEqual([
      `${base}/5/2026-08-15`,
      `${base}/5/2026-08-20`,
    ]);
  });

  it("30 hari = 6 request; hanya jendela terakhir yang revalidate 1 jam, sisanya 6 jam", async () => {
    const res = await GET(req("bbox=100,-1.4,104.7,3&dayRange=30"));
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(6);
    expect(fetchMock.mock.calls.map((c) => c[1]?.next?.revalidate)).toEqual([
      21600, 21600, 21600, 21600, 21600, 3600,
    ]);
    expect(String(fetchMock.mock.calls[0][0])).toBe(`${base}/5/2026-07-26`);
    expect(String(fetchMock.mock.calls[5][0])).toBe(`${base}/5/2026-08-20`);
  });

  it("hasil jendela digabung, deteksi ganda di batas jendela dibuang, respons private", async () => {
    // Mock mengembalikan baris yang sama untuk tiap jendela → tanpa dedup jadi 2.
    const res = await GET(req("bbox=100,-1.4,104.7,3&dayRange=10"));
    const fc = await res.json();
    expect(fc.features).toHaveLength(1);
    // Digerbangi permission → cache bersama (CDN/proxy) tidak boleh menyimpannya.
    expect(res.headers.get("Cache-Control")).toBe("private, max-age=1800");
  });

  it("satu jendela gagal → 502, bukan hasil sebagian yang diam-diam bolong", async () => {
    fetchMock
      .mockImplementationOnce(async () => new Response(CSV_OK, { status: 200 }))
      .mockImplementationOnce(async () => new Response("boom", { status: 500 }));
    const res = await GET(req("bbox=100,-1.4,104.7,3&dayRange=10"));
    expect(res.status).toBe(502);
    expect(await res.text()).not.toContain(TEST_KEY);
  });
});

describe("GET /api/map-hotspot — mode Bulan dari arsip SP / NRT (#365)", () => {
  const AVAIL_URL = `https://firms.modaps.eosdis.nasa.gov/api/data_availability/csv/${TEST_KEY}/ALL`;
  const AVAIL_CSV = [
    "data_id,min_date,max_date",
    "VIIRS_SNPP_NRT,2026-07-01,2026-09-22",
    "VIIRS_SNPP_SP,2012-01-20,2026-06-30",
  ].join("\n");
  const areaBase = (source: string) =>
    `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${TEST_KEY}/${source}/100,-1.4,104.7,3`;
  const areaCalls = () =>
    fetchMock.mock.calls.filter((c) => !String(c[0]).includes("data_availability"));

  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-09-22T10:00:00Z"), toFake: ["Date"] });
    fetchMock.mockImplementation(async (url: string) =>
      String(url).includes("data_availability")
        ? new Response(AVAIL_CSV, { status: 200 })
        : new Response(CSV_OK, { status: 200 })
    );
  });
  afterEach(() => vi.useRealTimers());

  it("400 bila month dan dayRange dikirim bersamaan — bukan diam-diam memilih salah satu", async () => {
    const res = await GET(req("bbox=100,-1.4,104.7,3&month=2025-01&dayRange=5"));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("400 untuk month tak valid: bulan depan, sebelum 2020, bentuk longgar", async () => {
    for (const m of ["2026-10", "2019-12", "2026-9", "2025-01-01", "abc", ""]) {
      const res = await GET(req(`bbox=100,-1.4,104.7,3&month=${encodeURIComponent(m)}`));
      expect(res.status, `month=${JSON.stringify(m)}`).toBe(400);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("bulan lampau: ketersediaan dibaca dulu, lalu 7 jendela SP ber-DATE dari tanggal 1; cache arsip 30 hari", async () => {
    const res = await GET(req("bbox=100,-1.4,104.7,3&month=2025-01"));
    expect(res.status).toBe(200);
    expect(String(fetchMock.mock.calls[0][0])).toBe(AVAIL_URL);
    expect(fetchMock.mock.calls[0][1]?.next?.revalidate).toBe(21600);
    const calls = areaCalls();
    expect(calls.map((c) => String(c[0]))).toEqual([
      `${areaBase("VIIRS_SNPP_SP")}/5/2025-01-01`,
      `${areaBase("VIIRS_SNPP_SP")}/5/2025-01-06`,
      `${areaBase("VIIRS_SNPP_SP")}/5/2025-01-11`,
      `${areaBase("VIIRS_SNPP_SP")}/5/2025-01-16`,
      `${areaBase("VIIRS_SNPP_SP")}/5/2025-01-21`,
      `${areaBase("VIIRS_SNPP_SP")}/5/2025-01-26`,
      `${areaBase("VIIRS_SNPP_SP")}/1/2025-01-31`,
    ]);
    expect(calls.every((c) => c[1]?.next?.revalidate === 30 * 24 * 3600)).toBe(true);
    expect(res.headers.get("Cache-Control")).toBe("private, max-age=86400");
  });

  it("respons bulan lampau = FeatureCollection + foreign member coverage (sumber & tanggal kosong)", async () => {
    const res = await GET(req("bbox=100,-1.4,104.7,3&month=2025-01"));
    const body = await res.json();
    expect(body.type).toBe("FeatureCollection");
    expect(body.features).toHaveLength(1); // baris sama di 7 jendela → dedup
    expect(body.coverage).toEqual({
      month: "2025-01",
      from: "2025-01-01",
      to: "2025-01-31",
      sources: ["VIIRS_SNPP_SP"],
      missingDates: [],
    });
  });

  it("bulan berjalan: dipangkas ke hari ini (UTC), sumber NRT, revalidate seperti rentang live, max-age 30 menit", async () => {
    const res = await GET(req("bbox=100,-1.4,104.7,3&month=2026-09"));
    expect(res.status).toBe(200);
    const calls = areaCalls();
    expect(calls.map((c) => String(c[0]))).toEqual([
      `${areaBase("VIIRS_SNPP_NRT")}/5/2026-09-01`,
      `${areaBase("VIIRS_SNPP_NRT")}/5/2026-09-06`,
      `${areaBase("VIIRS_SNPP_NRT")}/5/2026-09-11`,
      `${areaBase("VIIRS_SNPP_NRT")}/5/2026-09-16`,
      `${areaBase("VIIRS_SNPP_NRT")}/2/2026-09-21`,
    ]);
    expect(calls.map((c) => c[1]?.next?.revalidate)).toEqual([21600, 21600, 21600, 21600, 3600]);
    expect(res.headers.get("Cache-Control")).toBe("private, max-age=1800");
    const body = await res.json();
    expect(body.coverage).toMatchObject({ month: "2026-09", to: "2026-09-22", sources: ["VIIRS_SNPP_NRT"] });
  });

  it("celah ketersediaan dilaporkan di coverage.missingDates, jendela di kedua sumber tetap diambil", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      String(url).includes("data_availability")
        ? new Response(
            "data_id,min_date,max_date\nVIIRS_SNPP_NRT,2026-07-07,2026-09-22\nVIIRS_SNPP_SP,2012-01-20,2026-07-03",
            { status: 200 }
          )
        : new Response(CSV_OK, { status: 200 })
    );
    const res = await GET(req("bbox=100,-1.4,104.7,3&month=2026-07"));
    expect(res.status).toBe(200);
    const urls = areaCalls().map((c) => String(c[0]));
    expect(urls[0]).toBe(`${areaBase("VIIRS_SNPP_SP")}/3/2026-07-01`);
    expect(urls[1]).toBe(`${areaBase("VIIRS_SNPP_NRT")}/5/2026-07-07`);
    const body = await res.json();
    expect(body.coverage.sources).toEqual(["VIIRS_SNPP_SP", "VIIRS_SNPP_NRT"]);
    expect(body.coverage.missingDates).toEqual(["2026-07-04", "2026-07-05", "2026-07-06"]);
  });

  it("502 bila endpoint ketersediaan gagal atau membalas teks error — tanpa menebak sumber, tanpa bocor key", async () => {
    for (const reply of [new Response("boom", { status: 500 }), new Response("Invalid MAP_KEY.", { status: 200 })]) {
      fetchMock.mockReset().mockImplementation(async (url: string) =>
        String(url).includes("data_availability") ? reply.clone() : new Response(CSV_OK, { status: 200 })
      );
      const res = await GET(req("bbox=100,-1.4,104.7,3&month=2025-01"));
      expect(res.status).toBe(502);
      expect(await res.text()).not.toContain(TEST_KEY);
      expect(areaCalls()).toHaveLength(0);
    }
  });

  it("satu jendela arsip gagal → 502, bukan bulan yang diam-diam bolong", async () => {
    let n = 0;
    fetchMock.mockImplementation(async (url: string) => {
      if (String(url).includes("data_availability")) return new Response(AVAIL_CSV, { status: 200 });
      return ++n === 4 ? new Response("boom", { status: 500 }) : new Response(CSV_OK, { status: 200 });
    });
    const res = await GET(req("bbox=100,-1.4,104.7,3&month=2025-01"));
    expect(res.status).toBe(502);
  });

  it("mode rentang live tidak menyentuh endpoint ketersediaan dan tetap tanpa coverage", async () => {
    const res = await GET(req("bbox=100,-1.4,104.7,3&dayRange=5"));
    expect(res.status).toBe(200);
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes("data_availability"))).toBe(false);
    expect((await res.json()).coverage).toBeUndefined();
  });
});

describe("GET /api/map-hotspot — jalur sukses", () => {
  it("meneruskan CSV FIRMS sebagai GeoJSON FeatureCollection + header cache", async () => {
    const res = await GET(req(VALID_QS));
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toContain("max-age");

    const fc = await res.json();
    expect(fc.type).toBe("FeatureCollection");
    expect(fc.features).toHaveLength(1);
    // GeoJSON order [lng, lat].
    expect(fc.features[0].geometry).toEqual({ type: "Point", coordinates: [101.2, 0.5] });
    expect(fc.features[0].properties).toMatchObject({
      acqDate: "2026-08-08",
      acqDatetime: "2026-08-08T06:33:00Z",
      satellite: "N",
      confidence: "n",
      frp: 3.6,
    });

    // URL upstream: key + source + bbox + dayRange sesuai kontrak FIRMS.
    const upstreamUrl = String(fetchMock.mock.calls[0][0]);
    expect(upstreamUrl).toBe(
      `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${TEST_KEY}/VIIRS_SNPP_NRT/100,-1.4,104.7,3/2`
    );
  });
});

describe("GET /api/map-hotspot — jalur gagal upstream", () => {
  it("502 saat upstream non-OK, tanpa membocorkan map key", async () => {
    fetchMock.mockResolvedValue(new Response("boom", { status: 500 }));
    const res = await GET(req(VALID_QS));
    expect(res.status).toBe(502);
    expect(await res.text()).not.toContain(TEST_KEY);
  });

  it("502 saat upstream membalas teks error non-CSV (mis. key tidak valid)", async () => {
    fetchMock.mockResolvedValue(new Response("Invalid MAP_KEY.", { status: 200 }));
    const res = await GET(req(VALID_QS));
    expect(res.status).toBe(502);
    expect(await res.text()).not.toContain(TEST_KEY);
  });

  it("502 saat fetch melempar (timeout/abort), bukan crash", async () => {
    fetchMock.mockRejectedValue(new DOMException("Aborted", "AbortError"));
    const res = await GET(req(VALID_QS));
    expect(res.status).toBe(502);
    expect(await res.text()).not.toContain(TEST_KEY);
  });
});
