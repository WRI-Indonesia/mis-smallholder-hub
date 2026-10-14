import { describe, it, expect } from "vitest";
import {
  MAP_OVERLAYS,
  MAP_OVERLAYS_DRAW_ORDER,
  OVERLAY_BOTTOM_LAYER_ID,
  OVERLAY_GROUP_LABELS,
  findProxiedOverlay,
  overlayLayerId,
  overlayTileUrl,
} from "@/lib/map-overlays";

// Definisi overlay "Peta Lainnya" bersama Peta Lahan & Peta Supply Chain (#433).

describe("MAP_OVERLAYS — definisi", () => {
  it("key unik, tiap overlay punya kelompok, legenda, dan sumber", () => {
    const keys = MAP_OVERLAYS.map((o) => o.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const o of MAP_OVERLAYS) {
      expect(Object.keys(OVERLAY_GROUP_LABELS)).toContain(o.group);
      expect(o.legend.length).toBeGreaterThan(0);
      expect(o.source.length).toBeGreaterThan(0);
    }
  });

  it("9 overlay: 6 Kemenhut/BIG lewat proxy + 3 GFW langsung", () => {
    expect(MAP_OVERLAYS.filter((o) => o.group === "kemenhut" && o.kind === "arcgis")).toHaveLength(6);
    expect(MAP_OVERLAYS.filter((o) => o.group === "gfw" && o.kind === "xyz")).toHaveLength(3);
  });

  it("tile GFW memakai versi `latest` (versi lama dipensiunkan GFW) dan https", () => {
    for (const o of MAP_OVERLAYS) {
      if (o.kind !== "xyz") continue;
      expect(o.tiles.startsWith("https://tiles.globalforestwatch.org/")).toBe(true);
      expect(o.tiles).toContain("/latest/dynamic/{z}/{x}/{y}.png");
    }
  });

  it("kehilangan tutupan pohon hanya ≥ 2021 dan dirender berwarna (bukan encoded)", () => {
    const tcl = MAP_OVERLAYS.find((o) => o.key === "treeCoverLoss");
    expect(tcl?.kind).toBe("xyz");
    const url = new URL(overlayTileUrl(tcl!).replace("{z}/{x}/{y}", "0/0/0"));
    expect(url.searchParams.get("start_year")).toBe("2021");
    expect(url.searchParams.get("render_type")).toBe("true_color");
  });

  it("peringatan deforestasi membawa catatan 'bukan konfirmasi deforestasi'", () => {
    const alerts = MAP_OVERLAYS.find((o) => o.key === "deforestationAlerts");
    expect(alerts?.note).toMatch(/bukan konfirmasi deforestasi/);
  });
});

describe("urutan gambar", () => {
  it("lapisan perubahan (deforestasi/loss/alert) selalu di atas lapisan area", () => {
    const tiers = MAP_OVERLAYS_DRAW_ORDER.map((o) => o.tier);
    expect(tiers.indexOf("area")).toBeGreaterThan(tiers.lastIndexOf("change"));
    expect(MAP_OVERLAYS_DRAW_ORDER).toHaveLength(MAP_OVERLAYS.length);
  });

  it("OVERLAY_BOTTOM_LAYER_ID = layer overlay paling bawah", () => {
    expect(OVERLAY_BOTTOM_LAYER_ID).toBe(overlayLayerId(MAP_OVERLAYS_DRAW_ORDER.at(-1)!.key));
  });
});

describe("overlayTileUrl & findProxiedOverlay", () => {
  it("ArcGIS → proxy same-origin ber-bbox; GFW → URL langsung", () => {
    const kh = MAP_OVERLAYS.find((o) => o.key === "kawasanHutan")!;
    expect(overlayTileUrl(kh)).toBe("/api/map-overlay/kawasanHutan?bbox={bbox-epsg-3857}");
    const jrc = MAP_OVERLAYS.find((o) => o.key === "jrcForest2020")!;
    expect(overlayTileUrl(jrc).startsWith("https://")).toBe(true);
  });

  it("proxy hanya menerima key ArcGIS", () => {
    expect(findProxiedOverlay("pippib")?.kind).toBe("arcgis");
    expect(findProxiedOverlay("jrcForest2020")).toBeUndefined();
    expect(findProxiedOverlay("tidak-ada")).toBeUndefined();
  });
});
