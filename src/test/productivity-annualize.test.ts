import { describe, it, expect } from "vitest";
import {
  annualizeFactor,
  annualizeFactorFor,
  dataMonthsFromRecords,
  dataMonthsPerYear,
  isDataMonth,
  parcelAverageTonHa,
} from "@/lib/productivity-annualize";

/**
 * Penyetahunan produktivitas (owner 2026-10-08) — satu aturan untuk BMP Dashboard,
 * Peta BMP, dan matriks produksi detail Lembaga/Petani.
 */
describe("annualizeFactor", () => {
  it("12 ÷ bulan ber-data; tanpa data → 1 (tak disetahunkan)", () => {
    expect(annualizeFactor(12)).toBe(1);
    expect(annualizeFactor(6)).toBe(2);
    expect(annualizeFactor(7)).toBeCloseTo(12 / 7, 10);
    expect(annualizeFactor(0)).toBe(1);
    expect(annualizeFactor(undefined)).toBe(1);
  });

  it("annualizeFactorFor: kunci tahun angka atau string; peta absen → 1", () => {
    expect(annualizeFactorFor({ "2026": 8 }, 2026)).toBe(1.5);
    expect(annualizeFactorFor({ "2026": 8 }, "2026")).toBe(1.5);
    expect(annualizeFactorFor({ "2026": 8 }, 2025)).toBe(1);
    expect(annualizeFactorFor(undefined, 2026)).toBe(1);
  });
});

describe("dataMonthsPerYear — aturan bulan ber-data = seri bulanan snapshot BMP", () => {
  it("bulan dihitung bila ton (2 desimal) > 0 ATAU ada record ber-lahan", () => {
    expect(isDataMonth(0.01, 0)).toBe(true);
    expect(isDataMonth(0, 1)).toBe(true);
    expect(isDataMonth(0, 0)).toBe(false);
  });

  it("per tahun; < 5 kg tanpa lahan tak dihitung, < 5 kg ber-lahan tetap dihitung", () => {
    const months = dataMonthsPerYear([
      { period: "2025-01", kg: 1000, linked: 0 },
      { period: "2025-02", kg: 4, linked: 0 }, // terbulat 0 ton, tanpa lahan → bukan bulan ber-data
      { period: "2025-03", kg: 4, linked: 1 }, // terbulat 0 ton, tapi lahan melapor
      { period: "2026-07", kg: 500, linked: 2 },
    ]);
    expect(months).toEqual({ "2025": 2, "2026": 1 });
  });

  it("periode ganda dijumlah dulu; periode tak valid diabaikan", () => {
    const months = dataMonthsPerYear([
      { period: "2025-02", kg: 3, linked: 0 },
      { period: "2025-02", kg: 3, linked: 0 }, // 6 kg → 0,01 ton → dihitung
      { period: "2025-13", kg: 9000, linked: 1 },
      { period: "abc", kg: 9000, linked: 1 },
    ]);
    expect(months).toEqual({ "2025": 1 });
  });

  it("dataMonthsFromRecords: record mentah (parcelId null = tanpa lahan)", () => {
    expect(
      dataMonthsFromRecords([
        { parcelId: null, period: "2025-01", yieldKg: 900 },
        { parcelId: "p1", period: "2025-02", yieldKg: 0 },
        { parcelId: null, period: "2025-03", yieldKg: 0 },
      ])
    ).toEqual({ "2025": 2 });
  });
});

describe("parcelAverageTonHa", () => {
  it("rata-rata Ton/Ha/tahun baris tahunan; luas null/0 atau tanpa tahun → 0", () => {
    expect(parcelAverageTonHa(2, [{ productivityTonHa: 10 }, { productivityTonHa: 20 }])).toBe(15);
    expect(parcelAverageTonHa(null, [{ productivityTonHa: 10 }])).toBe(0);
    expect(parcelAverageTonHa(0, [{ productivityTonHa: 10 }])).toBe(0);
    expect(parcelAverageTonHa(2, [])).toBe(0);
  });
});
