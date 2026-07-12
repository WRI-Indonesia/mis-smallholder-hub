import { describe, it, expect } from "vitest";

interface FarmerWithParcels {
  farmerGroup: { name: string };
  landParcels?: Array<{ area?: number | null }>;
}

// Pure business logic helper functions to calculate stats
export function calculateFarmerSummaryStats(farmers: FarmerWithParcels[]) {
  const distinctKT     = new Set(farmers.map(f => f.farmerGroup.name)).size;
  const totalPetani    = farmers.length;
  const totalPersil    = farmers.reduce((sum, f) => sum + (f.landParcels?.length ?? 0), 0);
  const totalLuasLahan = farmers.reduce(
    (sum, f) => sum + (f.landParcels?.reduce((s: number, p) => s + (p.area ?? 0), 0) ?? 0),
    0
  );
  return {
    totalKT: distinctKT,
    totalPetani,
    totalPersil,
    totalLuasLahan,
  };
}

export function calculateFarmersWithoutParcelsStats(farmersWithoutParcels: FarmerWithParcels[], totalPetaniScope: number) {
  const distinctKT = new Set(farmersWithoutParcels.map(f => f.farmerGroup.name)).size;
  const percentage = totalPetaniScope > 0
    ? (farmersWithoutParcels.length / totalPetaniScope) * 100
    : 0;
  return {
    totalKT: distinctKT,
    totalFarmersWithoutParcels: farmersWithoutParcels.length,
    percentageFromTotal: parseFloat(percentage.toFixed(2)),
  };
}

describe("Data Analyst Stats Calculation", () => {
  describe("calculateFarmerSummaryStats", () => {
    it("should calculate correct stats for multiple farmers", () => {
      const mockFarmers = [
        {
          farmerId: "F-001",
          name: "Farmer A",
          farmerGroup: { name: "KT Sukamaju" },
          landParcels: [{ area: 1.5 }, { area: 2.0 }],
        },
        {
          farmerId: "F-002",
          name: "Farmer B",
          farmerGroup: { name: "KT Sukamaju" },
          landParcels: [{ area: 0.5 }],
        },
        {
          farmerId: "F-003",
          name: "Farmer C",
          farmerGroup: { name: "KT Indah" },
          landParcels: [],
        },
      ];

      const stats = calculateFarmerSummaryStats(mockFarmers);

      expect(stats.totalKT).toBe(2);
      expect(stats.totalPetani).toBe(3);
      expect(stats.totalPersil).toBe(3);
      expect(stats.totalLuasLahan).toBe(4.0);
    });

    it("should return zeros for empty list", () => {
      const stats = calculateFarmerSummaryStats([]);
      expect(stats.totalKT).toBe(0);
      expect(stats.totalPetani).toBe(0);
      expect(stats.totalPersil).toBe(0);
      expect(stats.totalLuasLahan).toBe(0);
    });
  });

  describe("calculateFarmersWithoutParcelsStats", () => {
    it("should calculate correct percentage and count of farmers without parcels", () => {
      const mockFarmersNoParcels = [
        {
          farmerId: "F-003",
          name: "Farmer C",
          farmerGroup: { name: "KT Indah" },
        },
      ];

      const stats = calculateFarmersWithoutParcelsStats(mockFarmersNoParcels, 4);

      expect(stats.totalKT).toBe(1);
      expect(stats.totalFarmersWithoutParcels).toBe(1);
      expect(stats.percentageFromTotal).toBe(25.0);
    });

    it("should handle division by zero or empty scopes safely", () => {
      const stats = calculateFarmersWithoutParcelsStats([], 0);
      expect(stats.totalKT).toBe(0);
      expect(stats.totalFarmersWithoutParcels).toBe(0);
      expect(stats.percentageFromTotal).toBe(0);
    });
  });
});
