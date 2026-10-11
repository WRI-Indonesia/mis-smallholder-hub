import { describe, expect, it } from "vitest";
import {
  availableYears,
  coveragePct,
  filterProductionGroups,
  periodsOfYear,
  sortProductionGroups,
  summarizeRange,
  yearCoverageAvg,
  yearOfPeriod,
} from "@/lib/production-availability";
import { PRODUCTION_STALE_MONTHS } from "@/lib/data-completeness-registry";
import { dataMonthsPerYear } from "@/lib/productivity-annualize";
import type { ProductionAvailabilityGroupRow, ProductionCellStats } from "@/types/production-availability";

/** Sel sintetis: `kg` bawaan 100 per record, semua ber-persil kecuali `noParcel`. */
const cell = (period: string, over: Partial<ProductionCellStats> = {}): ProductionCellStats => {
  const records = over.records ?? 1;
  const noParcelRecords = over.noParcelRecords ?? 0;
  return {
    period,
    parcelsReporting: over.parcelsReporting ?? records - noParcelRecords,
    records,
    linkedRecords: over.linkedRecords ?? records - noParcelRecords,
    kg: over.kg ?? records * 100,
    zeroRecords: over.zeroRecords ?? 0,
    estimateRecords: over.estimateRecords ?? 0,
    noParcelRecords,
  };
};

const group = (id: string, nonPsr: number, cells: ProductionCellStats[], over: Partial<ProductionAvailabilityGroupRow> = {}): ProductionAvailabilityGroupRow => ({
  id,
  name: over.name ?? id.toUpperCase(),
  code: over.code ?? null,
  abrv: over.abrv ?? null,
  category: over.category ?? "SWADAYA",
  districtId: over.districtId ?? "d1",
  districtName: over.districtName ?? "Siak",
  totalFarmers: over.totalFarmers ?? 10,
  totalParcels: over.totalParcels ?? nonPsr,
  nonPsrParcels: nonPsr,
  cells,
});

describe("production-availability — periode & persen (K3, K4)", () => {
  it("periodsOfYear menghasilkan 12 periode YYYY-MM urut", () => {
    const p = periodsOfYear(2026);
    expect(p).toHaveLength(12);
    expect(p[0]).toBe("2026-01");
    expect(p[11]).toBe("2026-12");
    expect(yearOfPeriod("2026-07")).toBe(2026);
    expect(yearOfPeriod("2026-13")).toBeNaN();
  });

  it("coveragePct = lahan melapor ÷ lahan non-PSR, dibatasi 100, null bila penyebut 0", () => {
    expect(coveragePct(4, 8)).toBe(50);
    expect(coveragePct(9, 8)).toBe(100); // record menunjuk lahan petani lain dalam Lembaga
    expect(coveragePct(3, 0)).toBeNull();
    expect(coveragePct(0, 8)).toBe(0);
  });

  it("yearCoverageAvg: bulan tanpa record = 0, 12 pembagi; null tanpa lahan non-PSR", () => {
    const g = group("a", 10, [cell("2026-01", { parcelsReporting: 10 }), cell("2026-02", { parcelsReporting: 5 })]);
    expect(yearCoverageAvg(g, 2026)).toBeCloseTo((100 + 50) / 12, 6);
    expect(yearCoverageAvg(group("b", 0, [cell("2026-01")]), 2026)).toBeNull();
  });
});

describe("production-availability — ringkasan rentang penuh (K4, K5)", () => {
  const cells = [
    cell("2025-11", { records: 3 }),
    cell("2025-12", { records: 3, estimateRecords: 3 }),
    cell("2026-01", { records: 4, zeroRecords: 1 }),
    cell("2026-03", { records: 2, noParcelRecords: 1 }),
  ];

  it("periode pertama/terakhir, jeda ke acuan, dan penanda dijumlahkan", () => {
    const s = summarizeRange(cells, "2026-05");
    expect(s.firstPeriod).toBe("2025-11");
    expect(s.lastPeriod).toBe("2026-03");
    expect(s.gapMonths).toBe(2);
    expect(s.stale).toBe(false);
    expect(s.totalRecords).toBe(12);
    expect(s.estimateRecords).toBe(3);
    expect(s.estimatePct).toBeCloseTo(25, 6);
    expect(s.zeroRecords).toBe(1);
    expect(s.noParcelRecords).toBe(1);
  });

  it(`basi bila jeda ≥ PRODUCTION_STALE_MONTHS (${PRODUCTION_STALE_MONTHS}) — ambang DA-02 yang sama`, () => {
    expect(summarizeRange(cells, `2026-0${3 + PRODUCTION_STALE_MONTHS}`).stale).toBe(true);
    expect(summarizeRange(cells, `2026-0${2 + PRODUCTION_STALE_MONTHS}`).stale).toBe(false);
  });

  it("bulan ber-data per tahun memakai aturan penyetahunan Peta BMP (dataMonthsPerYear)", () => {
    const s = summarizeRange(cells, "2026-05");
    const expected = dataMonthsPerYear(cells.map((c) => ({ period: c.period, kg: c.kg, linked: c.linkedRecords })));
    expect(s.monthsByYear).toEqual(expected);
    expect(s.monthsByYear).toEqual({ "2025": 2, "2026": 2 });
  });

  it("tanpa record → semua null/0, tidak basi (tak bisa dinilai)", () => {
    const s = summarizeRange([], "2026-05");
    expect(s.firstPeriod).toBeNull();
    expect(s.gapMonths).toBeNull();
    expect(s.stale).toBe(false);
    expect(s.estimatePct).toBe(0);
  });

  it("periode tak valid dan sel 0 record diabaikan", () => {
    const s = summarizeRange([cell("2026-1", {}), cell("2026-02", { records: 0 }), cell("2026-04")], "2026-05");
    expect(s.firstPeriod).toBe("2026-04");
    expect(s.totalRecords).toBe(1);
  });
});

describe("production-availability — tahun, filter, urutan", () => {
  const a = group("a", 10, [cell("2024-06"), cell("2026-01", { parcelsReporting: 2 })], { name: "Alpha", districtId: "d1", category: "EX_PLASMA", code: "ICS-1" });
  const b = group("b", 10, [cell("2026-01", { parcelsReporting: 9 }), cell("2026-02", { parcelsReporting: 9 })], { name: "Beta", districtId: "d2", districtName: "Kampar" });
  const c = group("c", 0, [cell("2025-07")], { name: "Gamma" });
  const d = group("d", 5, [], { name: "Delta" });

  it("availableYears: tahun ber-record + tahun berjalan, terbaru dulu", () => {
    expect(availableYears([a, b, c, d], 2026)).toEqual([2026, 2025, 2024]);
    expect(availableYears([d], 2026)).toEqual([2026]);
  });

  it("filter distrik / kategori / Lembaga / pencarian (nama, kode, distrik)", () => {
    const all = [a, b, c, d];
    expect(filterProductionGroups(all, { districtId: "d2" }).map((g) => g.id)).toEqual(["b"]);
    expect(filterProductionGroups(all, { category: "EX_PLASMA" }).map((g) => g.id)).toEqual(["a"]);
    expect(filterProductionGroups(all, { groupId: "c" }).map((g) => g.id)).toEqual(["c"]);
    expect(filterProductionGroups(all, { query: "ics-1" }).map((g) => g.id)).toEqual(["a"]);
    expect(filterProductionGroups(all, { query: "kampar" }).map((g) => g.id)).toEqual(["b"]);
    expect(filterProductionGroups(all, { query: "   " })).toHaveLength(4);
  });

  it("urut cakupan menaik: terendah dulu, yang tak bisa dinilai (tanpa lahan non-PSR) paling bawah", () => {
    const sorted = sortProductionGroups([a, b, c, d], "coverage", true, 2026, "2026-03").map((g) => g.id);
    // d = 0 % (tanpa record), a = 20 %/12, b = 180 %/12, c = null → terakhir.
    expect(sorted).toEqual(["d", "a", "b", "c"]);
  });

  it("urut nama & periode terakhir, arah menurun membalik", () => {
    expect(sortProductionGroups([b, a], "name", true, 2026, "2026-03").map((g) => g.id)).toEqual(["a", "b"]);
    expect(sortProductionGroups([a, b, d], "last", false, 2026, "2026-03").map((g) => g.id)).toEqual(["b", "a", "d"]);
  });
});
