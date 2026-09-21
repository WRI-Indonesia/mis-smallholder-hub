import { describe, expect, it } from "vitest";
import { HEAT_FULL, HEAT_GRADIENT_CSS, HEAT_STOPS, heatRgb, heatStyle, relativeLuminance } from "@/lib/score-heat";

/**
 * Skala warna heatmap DA-03 (#352 putaran 4): jangkar pada ambang band,
 * 100 = hijau tua terpisah, teks dipilih dari luminansi latar.
 */
describe("heatRgb", () => {
  it("mengembalikan warna jangkar persis pada titik jangkar", () => {
    for (const [score, rgb] of HEAT_STOPS) {
      if (score === 100) continue; // 100 → HEAT_FULL, bukan ujung gradasi
      expect(heatRgb(score)).toEqual(rgb);
    }
  });

  it("skor 100 memakai warna 'lengkap penuh' terpisah; 99,9 masih ujung gradasi", () => {
    expect(heatRgb(100)).toEqual(HEAT_FULL);
    expect(heatRgb(99.9)).not.toEqual(HEAT_FULL);
    expect(heatRgb(99.9)[1]).toBeGreaterThan(150); // hijau
  });

  it("interpolasi linear di antara jangkar (titik tengah 0–25)", () => {
    const [r, g, b] = heatRgb(12.5);
    expect(r).toBe(Math.round((185 + 239) / 2));
    expect(g).toBe(Math.round((28 + 68) / 2));
    expect(b).toBe(Math.round((28 + 68) / 2));
  });

  it("komponen merah turun & hijau naik sepanjang 0→99 (gradasi merah→hijau monoton di ujungnya)", () => {
    const lo = heatRgb(0);
    const mid = heatRgb(50);
    const hi = heatRgb(99);
    expect(lo[0]).toBeGreaterThan(hi[0]);
    expect(lo[1]).toBeLessThan(mid[1]);
    expect(mid[1]).toBeLessThan(hi[1]);
  });

  it("menjepit di luar rentang & NaN → 0", () => {
    expect(heatRgb(-20)).toEqual(heatRgb(0));
    expect(heatRgb(150)).toEqual(HEAT_FULL);
    expect(heatRgb(Number.NaN)).toEqual(heatRgb(0));
  });
});

describe("heatStyle — kontras teks", () => {
  it("latar gelap (0, 100) → teks putih; oranye 30–42 (rentang kritis) & terang (65, 80) → teks hitam", () => {
    expect(heatStyle(0).color).toBe("rgb(255 255 255)");
    expect(heatStyle(100).color).toBe("rgb(255 255 255)");
    for (const s of [30, 40, 42, 65, 80]) expect(heatStyle(s).color).toBe("rgb(0 0 0)");
  });

  it("kontras teks ≥ 4,5:1 (WCAG AA teks normal) di sepanjang ramp 0–99 — angka sel 11 px bukan teks besar", () => {
    const contrast = (l1: number, l2: number) => (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    for (let s = 0; s < 100; s += 1) {
      const bg = relativeLuminance(heatRgb(s));
      const fg = heatStyle(s).color === "rgb(255 255 255)" ? 1 : 0;
      expect(contrast(bg, fg)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("backgroundColor = rgb dari heatRgb", () => {
    const [r, g, b] = heatRgb(42);
    expect(heatStyle(42).backgroundColor).toBe(`rgb(${r} ${g} ${b})`);
  });
});

describe("relativeLuminance", () => {
  it("hitam 0, putih 1, hijau tua < ambang, kuning > ambang", () => {
    expect(relativeLuminance([0, 0, 0])).toBe(0);
    expect(relativeLuminance([255, 255, 255])).toBeCloseTo(1, 5);
    expect(relativeLuminance(HEAT_FULL)).toBeLessThan(0.35);
    expect(relativeLuminance([250, 204, 21])).toBeGreaterThan(0.35);
  });
});

describe("HEAT_GRADIENT_CSS", () => {
  it("memuat semua jangkar berurutan sebagai persen", () => {
    expect(HEAT_GRADIENT_CSS.startsWith("linear-gradient(to right, rgb(185 28 28) 0%")).toBe(true);
    expect(HEAT_GRADIENT_CSS.endsWith("rgb(16 185 129) 100%)")).toBe(true);
    expect(HEAT_GRADIENT_CSS.match(/%/g)?.length).toBe(HEAT_STOPS.length);
  });
});
