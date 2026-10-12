import { describe, it, expect } from "vitest";
import { clearedUrlKeys, hasActiveFilters } from "@/lib/filter-reset";

describe("hasActiveFilters (#427)", () => {
  const defaults = { district: null, group: null, status: "active", year: 2026, q: "", jenis: [] as string[] };

  it("state = bawaan → tidak aktif", () => {
    expect(hasActiveFilters({ ...defaults }, defaults)).toBe(false);
  });

  it("null, undefined, string kosong, dan spasi setara", () => {
    expect(hasActiveFilters({ ...defaults, district: undefined, group: "", q: "   " }, defaults)).toBe(false);
  });

  it("satu nilai berbeda → aktif, termasuk bawaan bukan 'Semua' (Status Aktif, tahun)", () => {
    expect(hasActiveFilters({ ...defaults, district: "d1" }, defaults)).toBe(true);
    expect(hasActiveFilters({ ...defaults, status: "all" }, defaults)).toBe(true);
    expect(hasActiveFilters({ ...defaults, year: 2025 }, defaults)).toBe(true);
    expect(hasActiveFilters({ ...defaults, q: "budi" }, defaults)).toBe(true);
  });

  it("daftar multi-pilih dibandingkan sebagai himpunan; kosong = bawaan", () => {
    const d = { jenis: ["SHM", "SKT"] };
    expect(hasActiveFilters({ jenis: ["SKT", "SHM"] }, d)).toBe(false);
    expect(hasActiveFilters({ jenis: ["SHM"] }, d)).toBe(true);
    expect(hasActiveFilters({ jenis: [] }, { jenis: null })).toBe(false);
  });

  it("boolean bawaan true (mis. toggle Per Distrik) dibandingkan apa adanya", () => {
    expect(hasActiveFilters({ byDistrict: false }, { byDistrict: true })).toBe(true);
    expect(hasActiveFilters({ byDistrict: true }, { byDistrict: true })).toBe(false);
  });

  it("kunci di luar bawaan diabaikan (mis. tab tampilan)", () => {
    expect(hasActiveFilters({ ...defaults, tab: "detail" }, defaults)).toBe(false);
  });
});

describe("clearedUrlKeys (#427)", () => {
  it("semua kunci bawaan jadi null (dihapus dari URL), kecuali kunci state lokal", () => {
    expect(clearedUrlKeys({ distrik: null, urut: "coverage", tahun: 2026, cari: "" }, ["cari"])).toEqual({
      distrik: null,
      urut: null,
      tahun: null,
    });
    expect(clearedUrlKeys({ a: "x" })).toEqual({ a: null });
  });
});
