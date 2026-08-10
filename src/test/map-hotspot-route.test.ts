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
  it("403 tanpa permission map-parcel VIEW, tanpa menyentuh upstream", async () => {
    hasPermission.mockResolvedValue(false);
    const res = await GET(req(VALID_QS));
    expect(res.status).toBe(403);
    expect(hasPermission).toHaveBeenCalledWith("map-parcel", "VIEW");
    expect(fetchMock).not.toHaveBeenCalled();
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

  it("400 untuk dayRange di luar {1, 2, 5}", async () => {
    for (const d of ["", "3", "6", "abc"]) {
      const res = await GET(req(`bbox=100,-1.4,104.7,3&dayRange=${d}`));
      expect(res.status).toBe(400);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("menerima dayRange 2 dan 5, serta 1 (kontrak lama) yang dipetakan ke 2 hari upstream", async () => {
    for (const [d, upstream] of [
      ["2", "2"],
      ["5", "5"],
      ["1", "2"], // bundle pra-deploy masih mengirim 1 — jangan 400
    ]) {
      fetchMock.mockClear();
      const res = await GET(req(`bbox=100,-1.4,104.7,3&dayRange=${d}`));
      expect(res.status).toBe(200);
      expect(String(fetchMock.mock.calls[0][0])).toMatch(new RegExp(`/${upstream}$`));
    }
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
