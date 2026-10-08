import { describe, it, expect } from "vitest";
import { landParcelLegalWhere, parseLandParcelReportFilters } from "@/lib/report-land-parcel-where";
import { describeLegalFilters, describeLegalSummary } from "@/lib/report-land-parcel";
import type { LandParcelLegalFilters, LandParcelReportSummary } from "@/types/report";

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

  it("bentuk field lain dijaga Zod — documentTypes bukan array tak lagi meledak di landParcelLegalWhere", () => {
    expect(parseLandParcelReportFilters({ coverage: "all", documentTypes: "SHM" })).toBeNull();
    expect(parseLandParcelReportFilters({ coverage: "all", farmerGroupId: 42 })).toBeNull();
    expect(parseLandParcelReportFilters({ coverage: "all", documentStatus: "kadang" })).toBeNull();
    // Nilai enum tak dikenal pada field string bebas tetap lolos dan diabaikan per field.
    const ok = parseLandParcelReportFilters({ coverage: "mapped", nktStatus: "ASING", documentTypes: ["SHM", "ASING"] })!;
    expect(landParcelLegalWhere(ok)).toHaveLength(2); // mapped + jenis surat SHM saja
  });

  it("menerima all / mapped apa adanya", () => {
    expect(parseLandParcelReportFilters({ coverage: "all", farmerGroupId: "g1" })).toEqual({ coverage: "all", farmerGroupId: "g1" });
    expect(parseLandParcelReportFilters({ coverage: "mapped" })).toEqual({ coverage: "mapped" });
  });
});

describe("describeLegalSummary ↔ describeLegalFilters — fallback cakupan sama", () => {
  const S: LandParcelReportSummary = {
    totalLahan: 100, totalPetani: 0, totalKelompokTani: 0, totalLembagaTani: 0, totalLuas: 0,
    totalDidata: 40, totalAdaSurat: 60, totalAdaStdb: 0, totalSelisihLuas: 0, totalNkt: 0, totalDinilaiNkt: 0, totalAdaPatok: 0, totalPatok: 0,
  };
  it("coverage tak sah (lolos cast) → keduanya membaca 'semua lahan', bukan header 'semua' + kartu 'sudah didata'", () => {
    const bogus = { coverage: undefined } as unknown as LandParcelLegalFilters;
    expect(describeLegalFilters(bogus)[0].value).toContain("Semua lahan");
    expect(describeLegalSummary(S, bogus).find((x) => x.label === "Ada Surat")!.note).toBe(
      "60% dari 100 lahan pada hasil filter (termasuk yang belum didata)"
    );
  });
});
