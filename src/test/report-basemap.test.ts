import { describe, it, expect } from "vitest";
import {
  basemapCacheKey,
  basemapPixelSize,
  basemapTileUrl,
  isTileBasemap,
  latToTileY,
  lonToTileX,
  pickBasemapZoom,
  BASEMAP_DEFAULT_DIM,
  BASEMAP_MAX_CELLS,
  BASEMAP_MAX_ZOOM,
  BASEMAP_TARGET_PX,
  REPORT_BASEMAP_ATTRIBUTION,
  REPORT_BASEMAP_KEYS,
  REPORT_BASEMAP_LABELS,
  REPORT_BASEMAP_STYLE_KEY,
} from "@/lib/report-basemap";
import { rasterTileTemplate, MAP_STYLE_KEYS } from "@/lib/map-style";

// Latar peta cetak Laporan Lahan (#318). Yang diuji di sini murni angka &
// konfigurasi — penjahitan tile butuh canvas nyata (jsdom hanya menyediakan
// stub), jadi `composeReportBasemap` sengaja tidak diuji di sini; jaminannya
// ada pada matematika di bawah + uji route proxy.

describe("matematika tile Web Mercator", () => {
  it("memetakan bujur ke sumbu-x tile", () => {
    expect(lonToTileX(-180, 0)).toBeCloseTo(0, 10);
    expect(lonToTileX(0, 0)).toBeCloseTo(0.5, 10);
    expect(lonToTileX(180, 0)).toBeCloseTo(1, 10);
    // z=1 membagi dunia jadi 2 kolom: Riau (±101,5° BT) ada di kolom kanan.
    expect(lonToTileX(101.5, 1)).toBeGreaterThan(1);
    expect(lonToTileX(101.5, 1)).toBeLessThan(2);
  });

  it("memetakan lintang ke sumbu-y tile (khatulistiwa di tengah)", () => {
    expect(latToTileY(0, 0)).toBeCloseTo(0.5, 10);
    expect(latToTileY(0, 4)).toBeCloseTo(8, 10);
    // Lintang naik ke utara → y turun.
    expect(latToTileY(2, 12)).toBeLessThan(latToTileY(0, 12));
  });

  it("menjepit lintang ke batas Mercator alih-alih meledak ke tak hingga", () => {
    expect(Number.isFinite(latToTileY(90, 5))).toBe(true);
    expect(Number.isFinite(latToTileY(-90, 5))).toBe(true);
    expect(latToTileY(90, 5)).toBeCloseTo(0, 6);
    expect(latToTileY(-90, 5)).toBeCloseTo(32, 6);
  });
});

describe("pickBasemapZoom", () => {
  it("memilih zoom terkecil yang sudah cukup tajam", () => {
    // 256·2^z·(0,1/360) ≥ 1600 → 2^z ≥ 22500 → z = 15.
    expect(pickBasemapZoom(0.1, 1600)).toBe(15);
    expect(pickBasemapZoom(0.2, 1600)).toBe(14);
  });

  it("naik saat rentang menyempit (halaman sel grid lebih detail)", () => {
    const luas = pickBasemapZoom(0.5, BASEMAP_TARGET_PX);
    const sempit = pickBasemapZoom(0.05, BASEMAP_TARGET_PX);
    expect(sempit).toBeGreaterThan(luas);
  });

  it("dibatasi zoom maksimum penyedia", () => {
    expect(pickBasemapZoom(1e-6, BASEMAP_TARGET_PX)).toBe(BASEMAP_MAX_ZOOM);
  });

  it("tidak pernah negatif, dan aman untuk masukan cacat", () => {
    expect(pickBasemapZoom(360, 16)).toBe(0);
    expect(pickBasemapZoom(0, 1600)).toBe(0);
    expect(pickBasemapZoom(-1, 1600)).toBe(0);
    expect(pickBasemapZoom(0.1, 0)).toBe(0);
  });
});

describe("basemapPixelSize", () => {
  it("meletakkan sisi terpanjang pada target, mengikuti rasio DERAJAT", () => {
    // Layout memakai mm/derajat yang sama untuk lon & lat, jadi mosaik pun
    // harus mengikuti rasio derajat — bukan rasio meter.
    const lebar = basemapPixelSize({ minLon: 101, minLat: 0, maxLon: 101.2, maxLat: 0.1 }, 1600);
    expect(lebar).toEqual({ w: 1600, h: 800 });

    const tinggi = basemapPixelSize({ minLon: 101, minLat: 0, maxLon: 101.1, maxLat: 0.2 }, 1600);
    expect(tinggi).toEqual({ w: 800, h: 1600 });
  });

  it("tidak pernah menghasilkan dimensi nol pada bbox degenerate", () => {
    const { w, h } = basemapPixelSize({ minLon: 101, minLat: 0, maxLon: 101, maxLat: 0 }, 1600);
    expect(w).toBeGreaterThan(0);
    expect(h).toBeGreaterThan(0);
  });
});

describe("basemapCacheKey", () => {
  const frame = { minLon: 101.1, minLat: 0.1, maxLon: 101.2, maxLat: 0.2 };

  it("membedakan kunci latar dan tingkat peredaman", () => {
    expect(basemapCacheKey("satellite", frame, 65)).not.toBe(basemapCacheKey("hybrid", frame, 65));
    expect(basemapCacheKey("satellite", frame, 65)).not.toBe(basemapCacheKey("satellite", frame, 40));
  });

  it("mengabaikan goyangan bbox di bawah 1e-6 (render ulang ceklis label)", () => {
    const goyang = { ...frame, maxLon: frame.maxLon + 1e-9 };
    expect(basemapCacheKey("satellite", goyang, 65)).toBe(basemapCacheKey("satellite", frame, 65));
  });

  it("tetap membedakan bbox yang benar-benar berbeda (antar sel grid)", () => {
    const lain = { ...frame, maxLon: frame.maxLon + 0.01 };
    expect(basemapCacheKey("satellite", lain, 65)).not.toBe(basemapCacheKey("satellite", frame, 65));
  });
});

describe("konfigurasi latar peta cetak", () => {
  it("empat pilihan, `none` sebagai bawaan yang mempertahankan perilaku lama", () => {
    expect(REPORT_BASEMAP_KEYS).toEqual(["none", "streetmap", "satellite", "hybrid"]);
    expect(isTileBasemap("none")).toBe(false);
    expect(REPORT_BASEMAP_KEYS.filter(isTileBasemap)).toEqual(["streetmap", "satellite", "hybrid"]);
  });

  it("tidak menawarkan style vector yang tak punya tile gambar", () => {
    // light/dark ada di MAP_STYLES tapi TIDAK boleh muncul di select ini.
    for (const key of ["light", "dark"] as const) {
      expect(MAP_STYLE_KEYS).toContain(key);
      expect(REPORT_BASEMAP_KEYS).not.toContain(key);
      expect(rasterTileTemplate(key)).toBeNull();
    }
  });

  it("setiap latar ber-tile benar-benar punya template raster di MAP_STYLES", () => {
    for (const key of REPORT_BASEMAP_KEYS.filter(isTileBasemap)) {
      const template = rasterTileTemplate(REPORT_BASEMAP_STYLE_KEY[key]);
      expect(template, key).toBeTruthy();
      expect(template).toContain("{z}");
      expect(template).toContain("{x}");
      expect(template).toContain("{y}");
    }
  });

  it("mewajibkan atribusi pada setiap latar ber-tile, dan tidak pada Polos", () => {
    expect(REPORT_BASEMAP_ATTRIBUTION.none).toBeNull();
    for (const key of REPORT_BASEMAP_KEYS.filter(isTileBasemap)) {
      expect(REPORT_BASEMAP_ATTRIBUTION[key], key).toBeTruthy();
    }
    expect(REPORT_BASEMAP_ATTRIBUTION.streetmap).toContain("OpenStreetMap");
    expect(REPORT_BASEMAP_ATTRIBUTION.satellite).toContain("Google");
    expect(REPORT_BASEMAP_ATTRIBUTION.hybrid).toContain("Google");
  });

  it("memberi label untuk tiap kunci select", () => {
    for (const key of REPORT_BASEMAP_KEYS) {
      expect(REPORT_BASEMAP_LABELS[key], key).toBeTruthy();
    }
  });

  it("mengunci ambang biaya yang disepakati owner", () => {
    expect(BASEMAP_MAX_CELLS).toBe(30);
    expect(BASEMAP_DEFAULT_DIM).toBe(65);
  });
});

describe("basemapTileUrl", () => {
  it("menunjuk proxy same-origin, bukan penyedia langsung (anti canvas taint)", () => {
    const url = basemapTileUrl("satellite", 15, 25735, 16383);
    expect(url.startsWith("/api/map-basemap?")).toBe(true);
    expect(url).not.toContain("google.com");
    const params = new URLSearchParams(url.slice(url.indexOf("?") + 1));
    expect(params.get("key")).toBe("satellite");
    expect(params.get("z")).toBe("15");
    expect(params.get("x")).toBe("25735");
    expect(params.get("y")).toBe("16383");
  });
});
