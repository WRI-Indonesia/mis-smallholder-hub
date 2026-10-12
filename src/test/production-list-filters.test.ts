import { describe, it, expect } from "vitest";
import {
  PRODUCTION_FILTER_DEFAULTS,
  hasProductionQuery,
  productionFiltersFromSearchParams,
} from "@/lib/production-list-filters";
import { hasActiveFilters } from "@/lib/filter-reset";

const groups = [
  { id: "g1", districtId: "d1" },
  { id: "g2", districtId: "d2" },
];

describe("productionFiltersFromSearchParams (#427)", () => {
  it("tanpa query → bawaan halaman (Reset tak tampil)", () => {
    const f = productionFiltersFromSearchParams({}, groups);
    expect(f).toEqual(PRODUCTION_FILTER_DEFAULTS);
    expect(hasActiveFilters(f, PRODUCTION_FILTER_DEFAULTS)).toBe(false);
    expect(hasProductionQuery({})).toBe(false);
  });

  it("tautan Kalender Ketersediaan: Lembaga + Distrik turunannya + Periode + Cari terisi", () => {
    const params = { farmerGroupId: "g2", period: "2026-03", search: "Budi" };
    const f = productionFiltersFromSearchParams(params, groups);
    expect(f).toEqual({ ...PRODUCTION_FILTER_DEFAULTS, district: "d2", group: "g2", period: "2026-03", search: "Budi" });
    expect(hasActiveFilters(f, PRODUCTION_FILTER_DEFAULTS)).toBe(true);
    expect(hasProductionQuery(params)).toBe(true);
  });

  it("Lembaga di luar opsi akun → Lembaga tetap terisi, Distrik Semua", () => {
    const f = productionFiltersFromSearchParams({ farmerGroupId: "gX" }, groups);
    expect(f.group).toBe("gX");
    expect(f.district).toBe("all");
  });

  it("Lahan & Status: nilai sah diteruskan, nilai tak dikenal jatuh ke bawaan", () => {
    expect(productionFiltersFromSearchParams({ hasParcel: "false", status: "inactive" }, groups)).toMatchObject({
      hasParcel: "false",
      status: "inactive",
    });
    expect(productionFiltersFromSearchParams({ hasParcel: "x", status: "y" }, groups)).toMatchObject({
      hasParcel: "all",
      status: "active",
    });
  });

  it("query bernilai sama dengan bawaan tetap dihitung sebagai saringan server", () => {
    expect(hasProductionQuery({ status: "active" })).toBe(true);
    expect(hasProductionQuery({ search: "" })).toBe(false);
  });
});
