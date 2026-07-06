import { describe, it, expect } from "vitest";

// Pure business logic helper functions to calculate report stats
export function calculateFarmerReportSummary(farmers: any[]) {
  let totalPersil = 0;
  let totalLuasLahan = 0;

  const rows = farmers.map((f) => {
    const farmerParcelsCount = f.landParcels?.length ?? 0;
    const farmerAreaSum = f.landParcels?.reduce((sum: number, p: any) => sum + (p.area ?? 0), 0) ?? 0;

    totalPersil += farmerParcelsCount;
    totalLuasLahan += farmerAreaSum;

    return {
      id: f.id,
      farmerId: f.farmerId,
      name: f.name,
      gender: f.gender,
      nik: f.nik,
      joinedYear: f.joinedYear,
      totalParcels: farmerParcelsCount,
      totalArea: parseFloat(farmerAreaSum.toFixed(2)),
    };
  });

  const totalPetani = farmers.length;
  const avgLuasLahan = totalPetani > 0 ? totalLuasLahan / totalPetani : 0;

  return {
    summary: {
      totalPetani,
      totalPersil,
      totalLuasLahan: parseFloat(totalLuasLahan.toFixed(2)),
      avgLuasLahan: parseFloat(avgLuasLahan.toFixed(2)),
    },
    rows,
  };
}

describe("Farmer Report Statistics Calculations", () => {
  describe("calculateFarmerReportSummary", () => {
    it("should calculate correct summary stats and map rows for multiple farmers", () => {
      const mockFarmers = [
        {
          id: "1",
          farmerId: "FMR-01",
          name: "Budi",
          gender: "M" as const,
          nik: "12345",
          joinedYear: 2021,
          landParcels: [{ area: 1.25 }, { area: 0.75 }],
        },
        {
          id: "2",
          farmerId: "FMR-02",
          name: "Siti",
          gender: "F" as const,
          nik: "67890",
          joinedYear: 2022,
          landParcels: [{ area: 2.5 }],
        },
        {
          id: "3",
          farmerId: "FMR-03",
          name: "Andi",
          gender: "M" as const,
          nik: null,
          joinedYear: null,
          landParcels: [],
        },
      ];

      const result = calculateFarmerReportSummary(mockFarmers);

      expect(result.summary.totalPetani).toBe(3);
      expect(result.summary.totalPersil).toBe(3);
      expect(result.summary.totalLuasLahan).toBe(4.5);
      expect(result.summary.avgLuasLahan).toBe(1.5);

      expect(result.rows[0].totalParcels).toBe(2);
      expect(result.rows[0].totalArea).toBe(2.0);
      expect(result.rows[1].totalParcels).toBe(1);
      expect(result.rows[1].totalArea).toBe(2.5);
      expect(result.rows[2].totalParcels).toBe(0);
      expect(result.rows[2].totalArea).toBe(0.0);
    });

    it("should return correct zeros and empty list when no farmers are present", () => {
      const result = calculateFarmerReportSummary([]);

      expect(result.summary.totalPetani).toBe(0);
      expect(result.summary.totalPersil).toBe(0);
      expect(result.summary.totalLuasLahan).toBe(0.0);
      expect(result.summary.avgLuasLahan).toBe(0.0);
      expect(result.rows.length).toBe(0);
    });

    it("should handle null/missing areas safely by counting them as zero", () => {
      const mockFarmers = [
        {
          id: "1",
          farmerId: "FMR-01",
          name: "Budi",
          gender: "M" as const,
          nik: "12345",
          joinedYear: 2021,
          landParcels: [{ area: null }, { area: 1.5 }],
        },
      ];

      const result = calculateFarmerReportSummary(mockFarmers);

      expect(result.summary.totalPetani).toBe(1);
      expect(result.summary.totalPersil).toBe(2);
      expect(result.summary.totalLuasLahan).toBe(1.5);
      expect(result.summary.avgLuasLahan).toBe(1.5);
    });
  });
});
