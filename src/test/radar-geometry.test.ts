import { describe, expect, it } from "vitest";
import { radarAngle, radarLabelAnchor, radarPoints, toPointsAttr } from "@/lib/radar-geometry";

const F = { cx: 100, cy: 92, r: 56 };

describe("radarPoints", () => {
  it("sumbu pertama tepat di atas pusat pada nilai penuh", () => {
    const [top] = radarPoints([100, 100, 100, 100, 100], F);
    expect(top[0]).toBeCloseTo(100, 6);
    expect(top[1]).toBeCloseTo(92 - 56, 6);
  });

  it("semua titik nilai penuh berjarak r dari pusat; nilai 0 jatuh di pusat", () => {
    for (const [x, y] of radarPoints([100, 100, 100, 100, 100], F)) {
      expect(Math.hypot(x - F.cx, y - F.cy)).toBeCloseTo(56, 6);
    }
    for (const [x, y] of radarPoints([0, 0, 0], F)) {
      expect(x).toBeCloseTo(F.cx, 6);
      expect(y).toBeCloseTo(F.cy, 6);
    }
  });

  it("searah jarum jam: sumbu kedua di kanan atas (x > cx, y < cy)", () => {
    const [, second] = radarPoints([100, 100, 100, 100, 100], F);
    expect(second[0]).toBeGreaterThan(F.cx);
    expect(second[1]).toBeLessThan(F.cy);
  });

  it("nilai di luar rentang dijepit, NaN → pusat", () => {
    const [over, nan] = radarPoints([250, Number.NaN], F);
    expect(Math.hypot(over[0] - F.cx, over[1] - F.cy)).toBeCloseTo(56, 6);
    expect(nan).toEqual([F.cx, F.cy]);
  });

  it("skala linear: 50 → setengah jari-jari", () => {
    const [half] = radarPoints([50], F);
    expect(Math.hypot(half[0] - F.cx, half[1] - F.cy)).toBeCloseTo(28, 6);
  });
});

describe("radarLabelAnchor", () => {
  it("atas = middle, kanan = start, kiri = end (5 sumbu)", () => {
    expect(radarLabelAnchor(0, 5)).toBe("middle");
    expect(radarLabelAnchor(1, 5)).toBe("start");
    expect(radarLabelAnchor(2, 5)).toBe("start");
    expect(radarLabelAnchor(3, 5)).toBe("end");
    expect(radarLabelAnchor(4, 5)).toBe("end");
  });

  it("4 sumbu: bawah juga middle", () => {
    expect(radarLabelAnchor(2, 4)).toBe("middle");
    expect(Math.cos(radarAngle(2, 4))).toBeCloseTo(0, 6);
  });
});

describe("toPointsAttr", () => {
  it("satu desimal, dipisah spasi", () => {
    expect(toPointsAttr([[100, 36], [153.2567, 74.69]])).toBe("100.0,36.0 153.3,74.7");
  });
});
