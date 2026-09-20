import { describe, it, expect } from "vitest";
import { axisMax, formatGeneratedAt, formatNumber, formatPct, formatArea } from "@/lib/format";

/** Helper bersama `src/lib/format.ts` — `formatGeneratedAt`/`axisMax` dipusatkan dari 5 + 4 salinan (review #347). */
describe("format.ts", () => {
  it("formatGeneratedAt: dd-Mon-yy HH:mm waktu lokal browser dari ISO — instan yang sama, apa pun zona", () => {
    const d = new Date(2026, 8, 20, 11, 5); // 20 Sep 2026 11:05 lokal
    expect(formatGeneratedAt(d.toISOString())).toBe("20-Sep-26 11:05");
    const jan = new Date(2027, 0, 3, 9, 0);
    expect(formatGeneratedAt(jan.toISOString())).toBe("03-Jan-27 09:00");
  });

  it("axisMax: batas bulat 1/2/5 × 10^n pertama ≥ maks data; floor untuk data ≤ 0", () => {
    expect(axisMax(0)).toBe(10);
    expect(axisMax(0, 5)).toBe(5);
    expect(axisMax(-3)).toBe(10);
    expect(axisMax(0.7)).toBe(1);
    expect(axisMax(5)).toBe(5);
    expect(axisMax(42)).toBe(50);
    expect(axisMax(100)).toBe(100);
    expect(axisMax(730)).toBe(1000);
    expect(axisMax(1200)).toBe(2000);
  });

  it("formatter angka id-ID tetap: ribuan titik, desimal koma", () => {
    expect(formatNumber(1234567)).toBe("1.234.567");
    expect(formatPct(87.55)).toBe("87,6");
    expect(formatArea(1234.5)).toBe("1.234,50");
  });
});
