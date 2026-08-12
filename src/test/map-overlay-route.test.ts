import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventEmitter } from "node:events";
import { NextRequest } from "next/server";

// Integration test route GET /api/map-overlay/[key] (#241, pola
// map-hotspot-route.test.ts): guard permission, whitelist key, validasi bbox,
// jalur sukses & gagal upstream. Upstream ArcGIS dipanggil route lewat
// `https.get` (bukan fetch) — modul node:https di-mock; tidak ada jaringan.
const hasPermission = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rbac", () => ({ hasPermission }));

const httpsGet = vi.hoisted(() => vi.fn());
vi.mock("node:https", () => ({ default: { get: httpsGet } }));

const { GET } = await import("@/app/api/map-overlay/[key]/route");
const { MAP_OVERLAYS } = await import("@/app/(admin)/admin/map/parcel/map-overlays");

const VALID_KEY = "kawasanHutan";
const UPSTREAM_HOST = "geoportal.planologi.kehutanan.go.id";
// bbox EPSG:3857 (Web Mercator) — empat angka dipisah koma.
const VALID_BBOX = "11897270.6,-156543.0,12523442.7,313086.1";
const PNG_BODY = Buffer.from("fake-png-bytes");

const call = (key: string, qs = `bbox=${VALID_BBOX}`) =>
  GET(new NextRequest(`http://localhost/api/map-overlay/${key}?${qs}`), {
    params: Promise.resolve({ key }),
  });

/** Fake `https.get`: Response baru per panggilan (pola mock fetch di
 *  map-hotspot-route.test.ts, diterjemahkan ke callback IncomingMessage). */
function mockUpstream(status = 200, contentType = "image/png", body: Buffer = PNG_BODY) {
  httpsGet.mockImplementation(
    (_url: string, _opts: unknown, cb: (res: EventEmitter) => void) => {
      const res = Object.assign(new EventEmitter(), {
        statusCode: status,
        headers: { "content-type": contentType },
      });
      const req = Object.assign(new EventEmitter(), { destroy: vi.fn() });
      process.nextTick(() => {
        cb(res);
        res.emit("data", body);
        res.emit("end");
      });
      return req;
    },
  );
}

function mockUpstreamNetworkError() {
  httpsGet.mockImplementation(() => {
    const req = Object.assign(new EventEmitter(), { destroy: vi.fn() });
    process.nextTick(() => req.emit("error", new Error("ECONNRESET")));
    return req;
  });
}

beforeEach(() => {
  hasPermission.mockReset().mockResolvedValue(true);
  httpsGet.mockReset();
  mockUpstream();
});

describe("GET /api/map-overlay/[key] — guard permission", () => {
  it("403 tanpa permission map-parcel VIEW, tanpa menyentuh upstream", async () => {
    hasPermission.mockResolvedValue(false);
    const res = await call(VALID_KEY);
    expect(res.status).toBe(403);
    expect(hasPermission).toHaveBeenCalledWith("map-parcel", "VIEW");
    expect(httpsGet).not.toHaveBeenCalled();
  });
});

describe("GET /api/map-overlay/[key] — validasi parameter", () => {
  it("404 untuk key di luar whitelist (bukan open proxy)", async () => {
    for (const key of ["nonexistent", "..%2Fetc", "kawasan-hutan"]) {
      const res = await call(key);
      expect(res.status).toBe(404);
    }
    expect(httpsGet).not.toHaveBeenCalled();
  });

  it("400 untuk bbox hilang/rusak", async () => {
    for (const qs of ["", "bbox=abc", "bbox=1,2,3", "bbox=1;2;3;4"]) {
      const res = await call(VALID_KEY, qs);
      expect(res.status).toBe(400);
    }
    expect(httpsGet).not.toHaveBeenCalled();
  });
});

describe("GET /api/map-overlay/[key] — jalur sukses", () => {
  it("meneruskan tile PNG upstream + header cache", async () => {
    const res = await call(VALID_KEY);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(res.headers.get("Cache-Control")).toContain("max-age");
    expect(Buffer.from(await res.arrayBuffer())).toEqual(PNG_BODY);

    // URL upstream: service overlay + kontrak export ArcGIS + bbox diteruskan.
    const overlay = MAP_OVERLAYS.find((o) => o.key === VALID_KEY)!;
    const upstreamUrl = String(httpsGet.mock.calls[0][0]);
    expect(upstreamUrl.startsWith(`${overlay.service}/export?bbox=${VALID_BBOX}`)).toBe(true);
    expect(upstreamUrl).toContain("bboxSR=3857");
    expect(upstreamUrl).toContain("f=image");
  });

  it("menyertakan param layers untuk overlay dengan exportLayers (gambut)", async () => {
    const res = await call("gambut");
    expect(res.status).toBe(200);
    expect(String(httpsGet.mock.calls[0][0])).toContain("layers=show:48");
  });
});

describe("GET /api/map-overlay/[key] — jalur gagal upstream", () => {
  it("502 saat upstream non-200, tanpa membocorkan host upstream", async () => {
    mockUpstream(500, "text/html", Buffer.from("Internal error"));
    const res = await call(VALID_KEY);
    expect(res.status).toBe(502);
    expect(await res.text()).not.toContain(UPSTREAM_HOST);
  });

  it("502 saat upstream 200 tapi bukan image (mis. halaman error ArcGIS)", async () => {
    mockUpstream(200, "text/html", Buffer.from("<html>ArcGIS error</html>"));
    const res = await call(VALID_KEY);
    expect(res.status).toBe(502);
    expect(await res.text()).not.toContain(UPSTREAM_HOST);
  });

  it("502 saat koneksi upstream error (ECONNRESET), bukan crash", async () => {
    mockUpstreamNetworkError();
    const res = await call(VALID_KEY);
    expect(res.status).toBe(502);
    expect(await res.text()).not.toContain(UPSTREAM_HOST);
  });
});
