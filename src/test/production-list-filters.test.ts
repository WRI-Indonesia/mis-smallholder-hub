import { describe, it, expect } from "vitest";
import { PRODUCTION_FILTER_DEFAULTS, productionFiltersFromSearchParams } from "@/lib/production-list-filters";
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
  });

  it("tautan Kalender Ketersediaan: Lembaga + Distrik turunannya + Periode + Cari terisi", () => {
    const f = productionFiltersFromSearchParams({ farmerGroupId: "g2", period: "2026-03", search: "Budi" }, groups);
    expect(f).toEqual({ ...PRODUCTION_FILTER_DEFAULTS, district: "d2", group: "g2", period: "2026-03", search: "Budi" });
    expect(hasActiveFilters(f, PRODUCTION_FILTER_DEFAULTS)).toBe(true);
  });

  it("Lembaga di luar opsi akun (scope/nonaktif) → tidak diterapkan, bukan saringan tersembunyi", () => {
    const f = productionFiltersFromSearchParams({ farmerGroupId: "gX" }, groups);
    expect(f.group).toBe("all");
    expect(f.district).toBe("all");
  });

  it("Periode bukan YYYY-MM (tak bisa ditampilkan input bulan) → kosong", () => {
    expect(productionFiltersFromSearchParams({ period: "2026-3" }, groups).period).toBe("");
    expect(productionFiltersFromSearchParams({ period: "2026-13" }, groups).period).toBe("");
    expect(productionFiltersFromSearchParams({ period: "2026-12" }, groups).period).toBe("2026-12");
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
});
