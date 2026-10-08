import { describe, it, expect } from "vitest";
import { landParcelLegalWhere, parseLandParcelReportFilters } from "@/lib/report-land-parcel-where";
import { describeLegalFilters } from "@/lib/report-land-parcel";
import type { LandParcelLegalFilters } from "@/types/report";

/**
 * #319: `coverage` Laporan Lahan WAJIB — tak ada default yang bisa berbeda antara
 * `where` yang dijalankan dan teks "Cakupan Pendataan" di header PDF/Excel (#305).
 */
const MAPPED_CLAUSE = { identity: { externalIds: { some: { isActive: true } } } };

describe("landParcelLegalWhere ↔ describeLegalFilters — cakupan pendataan", () => {
  const cases: LandParcelLegalFilters[] = [
    { coverage: "all" },
    { coverage: "mapped" },
    { coverage: "all", documentStatus: "without", stdbStatus: "with" },
    { coverage: "mapped", documentStatus: "without", nktStatus: "affected", marker: "problem" },
  ];

  for (const filters of cases) {
    it(`where & teks sepakat: ${JSON.stringify(filters)}`, () => {
      const restricts = landParcelLegalWhere(filters).some((w) => JSON.stringify(w) === JSON.stringify(MAPPED_CLAUSE));
      const text = describeLegalFilters(filters).find((f) => f.label === "Cakupan Pendataan")!.value;
      const saysMapped = text.startsWith("Hanya lahan yang sudah didata");
      expect(restricts).toBe(saysMapped);
      expect(restricts).toBe(filters.coverage === "mapped");
    });
  }
});

describe("parseLandParcelReportFilters — coverage wajib dari klien", () => {
  it("menolak filter tanpa / dengan coverage tak sah (tidak jatuh ke default)", () => {
    expect(parseLandParcelReportFilters({})).toBeNull();
    expect(parseLandParcelReportFilters({ documentStatus: "without" })).toBeNull();
    expect(parseLandParcelReportFilters({ coverage: "semua" })).toBeNull();
    expect(parseLandParcelReportFilters(null)).toBeNull();
    expect(parseLandParcelReportFilters("all")).toBeNull();
  });

  it("menerima all / mapped apa adanya", () => {
    expect(parseLandParcelReportFilters({ coverage: "all", farmerGroupId: "g1" })).toEqual({ coverage: "all", farmerGroupId: "g1" });
    expect(parseLandParcelReportFilters({ coverage: "mapped" })).toEqual({ coverage: "mapped" });
  });
});
