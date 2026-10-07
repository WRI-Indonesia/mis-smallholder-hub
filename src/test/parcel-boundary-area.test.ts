import { describe, it, expect } from "vitest";
import { PARCEL_AREA_MISMATCH_RATIO as DA02_RATIO } from "@/lib/data-completeness-registry";
import {
  PARCEL_AREA_MISMATCH_RATIO,
  areaMismatchRatio,
  buildAreaMismatchRows,
  buildOutsideBoundaryRows,
  findingFilterOptions,
  findingsByGroup,
  isAreaMismatch,
  outsideKind,
  parseOutsideKind,
  parseTopologyTab,
  topGroupsShare,
  type AreaMismatchRaw,
  type OutsideBoundaryRaw,
} from "@/lib/parcel-boundary-area";

const ident = (id: string, groupId = "g1", districtId = "d1") => ({
  id,
  parcelId: `P-${id}`,
  kelompokTani: null,
  farmerId: `f-${id}`,
  farmerCode: `F-${id}`,
  farmerName: `Petani ${id}`,
  groupId,
  groupName: `Lembaga ${groupId}`,
  districtId,
  districtName: `Distrik ${districtId}`,
});

describe("outsideKind — Luar Boundary (#317)", () => {
  it("tak beririsan dengan boundary = Sepenuhnya di luar (definisi DA-02)", () => {
    expect(outsideKind(10_000, 10_000, false)).toBe("FULL");
  });

  it("beririsan: Sebagian bila bagian luar ≥ 100 m² ATAU ≥ 1%, selain itu tepi (bukan temuan)", () => {
    expect(outsideKind(10_000, 50, true)).toBeNull(); // 50 m², 0,5%
    expect(outsideKind(100_000, 150, true)).toBe("PARTIAL"); // 150 m², 0,15%
    expect(outsideKind(2_000, 50, true)).toBe("PARTIAL"); // 50 m², 2,5%
    expect(outsideKind(10_000, 0, true)).toBeNull();
  });
});

describe("buildOutsideBoundaryRows", () => {
  const raw = (id: string, polygonM2: number, outsideM2: number, intersects: boolean, distanceM: number | null = null): OutsideBoundaryRaw => ({
    ...ident(id),
    polygonM2,
    outsideM2,
    intersects,
    distanceM,
  });

  it("Sepenuhnya: luas di luar = luas poligon, 100%, jarak dibulatkan; Sebagian tanpa jarak", () => {
    const [full, partial] = buildOutsideBoundaryRows([raw("b", 20_000, 5_000, true, 999), raw("a", 15_000, 15_000, false, 1234.6)]);
    expect(full).toMatchObject({ id: "a", kind: "FULL", polygonHa: 1.5, outsideHa: 1.5, outsidePct: 100, distanceM: 1235 });
    expect(partial).toMatchObject({ id: "b", kind: "PARTIAL", outsideHa: 0.5, outsidePct: 25, distanceM: null });
  });

  it("tepi boundary dibuang; urutan Sepenuhnya dulu lalu % di luar terbesar", () => {
    const rows = buildOutsideBoundaryRows([
      raw("tepi", 10_000, 20, true),
      raw("p10", 10_000, 1_000, true),
      raw("p40", 10_000, 4_000, true),
      raw("full", 10_000, 10_000, false, 50),
    ]);
    expect(rows.map((r) => r.id)).toEqual(["full", "p40", "p10"]);
  });
});

describe("Selisih Luas — satu definisi dengan DA-02", () => {
  it("ambang = konstanta check Ketersediaan Data (bukan salinan)", () => {
    expect(PARCEL_AREA_MISMATCH_RATIO).toBe(DA02_RATIO);
  });

  it("rasio terhadap yang lebih besar; tepat 20% bukan temuan (ketat >)", () => {
    expect(areaMismatchRatio(1, 0.8)).toBeCloseTo(0.2);
    expect(isAreaMismatch(1, 0.8)).toBe(false);
    expect(isAreaMismatch(1, 0.79)).toBe(true);
    expect(isAreaMismatch(0.79, 1)).toBe(true);
  });

  it("luas kosong / ≤ 0 tidak dinilai", () => {
    expect(areaMismatchRatio(null, 1)).toBeNull();
    expect(areaMismatchRatio(0, 1)).toBeNull();
    expect(isAreaMismatch(1, null)).toBe(false);
  });

  it("buildAreaMismatchRows: arah, persen, urut selisih terbesar", () => {
    const raw = (id: string, recordedHa: number, polygonM2: number): AreaMismatchRaw => ({ ...ident(id), recordedHa, polygonM2 });
    const rows = buildAreaMismatchRows([raw("ok", 1, 9_000), raw("besar", 2, 10_000), raw("kecil", 0.5, 10_000)]);
    expect(rows.map((r) => [r.id, r.diffPct, r.recordedLarger])).toEqual([
      ["besar", 50, true],
      ["kecil", 50, false],
    ]);
    expect(rows[0]).toMatchObject({ recordedHa: 2, polygonHa: 1 });
  });
});

describe("ringkasan per Lembaga & filter", () => {
  const rows = [
    ...Array.from({ length: 5 }, (_, i) => ({ ...ident(`a${i}`, "A", "d1"), polygonHa: 1 })),
    ...Array.from({ length: 3 }, (_, i) => ({ ...ident(`b${i}`, "B", "d2"), polygonHa: 1 })),
    { ...ident("c", "C", "d1"), polygonHa: 1 },
    { ...ident("d", "D", "d2"), polygonHa: 1 },
  ];

  it("terbanyak dulu; porsi 3 Lembaga teratas", () => {
    const byGroup = findingsByGroup(rows);
    expect(byGroup.map((g) => [g.groupId, g.count])).toEqual([["A", 5], ["B", 3], ["C", 1], ["D", 1]]);
    expect(topGroupsShare(byGroup)).toBe(90);
    expect(topGroupsShare([])).toBe(0);
  });

  it("opsi filter dari temuan, urut nama", () => {
    const o = findingFilterOptions(rows);
    expect(o.groups.map((g) => g.id)).toEqual(["A", "B", "C", "D"]);
    expect(o.districts.map((d) => d.id)).toEqual(["d1", "d2"]);
  });

  it("parser tab & jenis menolak nilai asing", () => {
    expect(parseTopologyTab("luar-boundary")).toBe("luar-boundary");
    expect(parseTopologyTab("x")).toBe("tumpang-tindih");
    expect(parseTopologyTab(null)).toBe("tumpang-tindih");
    expect(parseOutsideKind("PARTIAL")).toBe("PARTIAL");
    expect(parseOutsideKind("y")).toBeNull();
  });
});
