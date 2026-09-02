import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Integration test route GET /api/map-basemap (#318, pola
// map-hotspot-route.test.ts): guard permission, whitelist kunci, validasi z/x/y,
// jalur sukses & gagal upstream. Fetch tile di-mock global — tanpa jaringan.
//
// Route ini ADA justru demi ekspor: tile yang ditarik langsung dari penyedia
// men-taint canvas sehingga `toDataURL` (PDF & Excel) melempar SecurityError.
// Karena itu yang diuji bukan cuma guard, tapi juga bahwa URL upstream disusun
// dari `MAP_STYLES` — bukan disalin ulang di route.
const hasPermission = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rbac", () => ({ hasPermission }));

const { GET } = await import("@/app/api/map-basemap/route");
const { rasterTileTemplate } = await import("@/lib/map-style");
const { BASEMAP_MAX_ZOOM } = await import("@/lib/report-basemap");

const PNG_BODY = new Uint8Array([137, 80, 78, 71]);
const VALID_QS = "key=satellite&z=15&x=25735&y=16383";
const req = (qs: string) => new NextRequest(`http://localhost/api/map-basemap?${qs}`);

const fetchMock = vi.fn();

beforeEach(() => {
  hasPermission.mockReset().mockResolvedValue(true);
  // Response baru per panggilan — body hanya bisa dibaca sekali.
  fetchMock.mockReset().mockImplementation(
    async () => new Response(PNG_BODY, { status: 200, headers: { "content-type": "image/png" } }),
  );
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GET /api/map-basemap — guard & whitelist", () => {
  it("403 tanpa permission report-land-parcel VIEW, tanpa menyentuh upstream", async () => {
    hasPermission.mockResolvedValue(false);
    const res = await GET(req(VALID_QS));
    expect(res.status).toBe(403);
    expect(hasPermission).toHaveBeenCalledWith("report-land-parcel", "VIEW");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("404 untuk kunci di luar whitelist — bukan proxy anonim", async () => {
    for (const key of ["", "osm", "../etc/passwd", "toString", "constructor"]) {
      const res = await GET(req(`key=${encodeURIComponent(key)}&z=15&x=1&y=1`));
      expect(res.status, key).toBe(404);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("404 untuk style vector yang tak punya tile gambar", async () => {
    // light/dark ada di MAP_STYLES tapi bukan latar peta cetak; keduanya harus
    // ditolak di gerbang whitelist, sebelum sempat menyentuh upstream.
    for (const key of ["light", "dark"]) {
      const res = await GET(req(`key=${key}&z=15&x=1&y=1`));
      expect(res.status, key).toBe(404);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("GET /api/map-basemap — validasi koordinat tile", () => {
  it("400 untuk z cacat atau di atas zoom maksimum", async () => {
    for (const z of ["", "abc", "-1", "1.5", String(BASEMAP_MAX_ZOOM + 1)]) {
      const res = await GET(req(`key=satellite&z=${encodeURIComponent(z)}&x=0&y=0`));
      expect(res.status, z).toBe(400);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("400 bila x/y di luar grid zoom-nya — endpoint tak bisa menembak path sembarang", async () => {
    // z=1 hanya punya indeks 0..1.
    for (const qs of ["key=satellite&z=1&x=2&y=0", "key=satellite&z=1&x=0&y=2"]) {
      const res = await GET(req(qs));
      expect(res.status, qs).toBe(400);
    }
    // x/y hilang atau bukan bilangan bulat non-negatif.
    for (const qs of ["key=satellite&z=1", "key=satellite&z=1&x=-1&y=0", "key=satellite&z=1&x=0&y=a"]) {
      const res = await GET(req(qs));
      expect(res.status, qs).toBe(400);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("menerima indeks tepat di tepi grid", async () => {
    const res = await GET(req("key=satellite&z=1&x=1&y=1"));
    expect(res.status).toBe(200);
  });
});

describe("GET /api/map-basemap — jalur sukses", () => {
  it("menyusun URL upstream dari template MAP_STYLES, bukan salinan", async () => {
    const res = await GET(req(VALID_QS));
    expect(res.status).toBe(200);

    const expected = rasterTileTemplate("satellite")!
      .replace("{z}", "15")
      .replace("{x}", "25735")
      .replace("{y}", "16383");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(expected);
    // Tak ada placeholder tersisa — semua tersubstitusi.
    expect(fetchMock.mock.calls[0][0]).not.toMatch(/\{[zxy]\}/);
  });

  it("meneruskan tiap kunci ber-whitelist ke host-nya masing-masing", async () => {
    for (const key of ["streetmap", "satellite", "hybrid"]) {
      fetchMock.mockClear();
      const res = await GET(req(`key=${key}&z=12&x=100&y=100`));
      expect(res.status, key).toBe(200);
      expect(fetchMock.mock.calls[0][0], key).toBe(
        rasterTileTemplate(key as "streetmap").replace("{z}", "12").replace("{x}", "100").replace("{y}", "100"),
      );
    }
  });

  it("mengenali diri ke OSM lewat User-Agent (kebijakan tile.openstreetmap.org)", async () => {
    await GET(req("key=streetmap&z=12&x=100&y=100"));
    const init = fetchMock.mock.calls[0][1] as { headers: Record<string, string> };
    expect(init.headers["User-Agent"]).toBeTruthy();
  });

  it("meneruskan gambar dengan cache panjang — ratusan tile per ekspor grid", async () => {
    const res = await GET(req(VALID_QS));
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(res.headers.get("Cache-Control")).toContain("max-age=86400");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(PNG_BODY);
  });
});

describe("GET /api/map-basemap — kegagalan upstream", () => {
  it("502 bila upstream menjawab non-200", async () => {
    fetchMock.mockResolvedValue(new Response("nope", { status: 404 }));
    expect((await GET(req(VALID_QS))).status).toBe(502);
  });

  it("502 bila upstream menjawab non-gambar (mis. halaman HTML kuota habis)", async () => {
    fetchMock.mockResolvedValue(
      new Response("<html>quota</html>", { status: 200, headers: { "content-type": "text/html" } }),
    );
    expect((await GET(req(VALID_QS))).status).toBe(502);
  });

  it("502 bila fetch gagal/timeout, bukan melempar ke pemanggil", async () => {
    fetchMock.mockRejectedValue(new Error("ETIMEDOUT"));
    expect((await GET(req(VALID_QS))).status).toBe(502);
  });
});
