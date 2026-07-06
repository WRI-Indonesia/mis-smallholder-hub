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

export function calculateTrainingReportSummary(farmers: any[], activities: any[]) {
  // Exclude OTHER package activities
  const filteredActivities = activities.filter((act) => act.package?.code !== "OTHER");

  // Calculate package participation maps
  const farmerPackageMap = new Map<string, Set<string>>(); // farmerId -> set of package codes they completed
  filteredActivities.forEach((act) => {
    act.participants?.forEach((p: any) => {
      if (!farmerPackageMap.has(p.farmerId)) {
        farmerPackageMap.set(p.farmerId, new Set());
      }
      farmerPackageMap.get(p.farmerId)!.add(act.package.code);
    });
  });

  // Unique participant counts across ALL training activities (excluding OTHER)
  const uniqueParticipantsSet = new Set<string>();
  filteredActivities.forEach((act) => {
    act.participants?.forEach((p: any) => {
      uniqueParticipantsSet.add(p.farmerId);
    });
  });

  // Package coverage (unique farmers completed specific packages)
  let totalUnikPaket1 = 0;
  let totalUnikPaket2MK = 0;
  let totalUnikPaket2K3 = 0;
  let totalUnikPaket34 = 0;

  farmers.forEach((f) => {
    const completed = farmerPackageMap.get(f.id) || new Set<string>();
    if (completed.has("PAKET_1_BMP_PC_RSPO_NKT")) {
      totalUnikPaket1++;
    }
    if (completed.has("PAKET_2_MK")) {
      totalUnikPaket2MK++;
    }
    if (completed.has("PAKET_2_K3")) {
      totalUnikPaket2K3++;
    }
    if (completed.has("PAKET_3_4_GEDSI_FINANCIAL_LIVELIHOOD_BUSDEV")) {
      totalUnikPaket34++;
    }
  });

  const totalPetani = farmers.length;
  const totalKegiatan = filteredActivities.length;
  const totalPeserta = filteredActivities.reduce((sum, act) => sum + (act.participants?.length ?? 0), 0);
  const totalPesertaUnik = uniqueParticipantsSet.size;

  const pctPaket1 = totalPetani > 0 ? parseFloat(((totalUnikPaket1 / totalPetani) * 100).toFixed(2)) : 0;
  const pctPaket2MK = totalPetani > 0 ? parseFloat(((totalUnikPaket2MK / totalPetani) * 100).toFixed(2)) : 0;
  const pctPaket2K3 = totalPetani > 0 ? parseFloat(((totalUnikPaket2K3 / totalPetani) * 100).toFixed(2)) : 0;
  const pctPaket34 = totalPetani > 0 ? parseFloat(((totalUnikPaket34 / totalPetani) * 100).toFixed(2)) : 0;

  return {
    totalPetani,
    totalKegiatan,
    totalPeserta,
    totalPesertaUnik,
    totalUnikPaket1,
    pctPaket1,
    totalUnikPaket2MK,
    pctPaket2MK,
    totalUnikPaket2K3,
    pctPaket2K3,
    totalUnikPaket34,
    pctPaket34,
  };
}

describe("Training Report Statistics Calculations", () => {
  describe("calculateTrainingReportSummary", () => {
    it("should calculate correct stats and percentages while excluding OTHER package", () => {
      const mockFarmers = [
        { id: "f1", name: "Farmer 1" },
        { id: "f2", name: "Farmer 2" },
        { id: "f3", name: "Farmer 3" },
        { id: "f4", name: "Farmer 4" },
      ];

      const mockActivities = [
        {
          id: "act1",
          package: { code: "PAKET_1_BMP_PC_RSPO_NKT" },
          participants: [{ farmerId: "f1" }, { farmerId: "f2" }],
        },
        {
          id: "act2",
          package: { code: "PAKET_2_MK" },
          participants: [{ farmerId: "f2" }, { farmerId: "f3" }],
        },
        {
          id: "act3",
          package: { code: "OTHER" }, // should be excluded
          participants: [{ farmerId: "f4" }],
        },
        {
          id: "act4",
          package: { code: "PAKET_3_4_GEDSI_FINANCIAL_LIVELIHOOD_BUSDEV" },
          participants: [{ farmerId: "f1" }],
        },
        {
          id: "act5",
          package: { code: "PAKET_2_K3" },
          participants: [{ farmerId: "f3" }],
        },
      ];

      const result = calculateTrainingReportSummary(mockFarmers, mockActivities);

      expect(result.totalPetani).toBe(4);
      expect(result.totalKegiatan).toBe(4); // excludes OTHER
      expect(result.totalPeserta).toBe(6); // 2 + 2 + 1 + 1 (excludes OTHER's 1)
      expect(result.totalPesertaUnik).toBe(3); // f1, f2, f3 (excludes f4 from OTHER)

      expect(result.totalUnikPaket1).toBe(2); // f1, f2
      expect(result.pctPaket1).toBe(50.0); // 2 of 4

      expect(result.totalUnikPaket2MK).toBe(2); // f2, f3
      expect(result.pctPaket2MK).toBe(50.0); // 2 of 4

      expect(result.totalUnikPaket2K3).toBe(1); // f3
      expect(result.pctPaket2K3).toBe(25.0); // 1 of 4

      expect(result.totalUnikPaket34).toBe(1); // f1
      expect(result.pctPaket34).toBe(25.0); // 1 of 4
    });

    it("should return zeros when there are no farmers and no activities", () => {
      const result = calculateTrainingReportSummary([], []);
      expect(result.totalPetani).toBe(0);
      expect(result.totalKegiatan).toBe(0);
      expect(result.totalPeserta).toBe(0);
      expect(result.totalPesertaUnik).toBe(0);
      expect(result.pctPaket1).toBe(0);
    });
  });
});
